import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query, ID } from 'appwrite';
import { toast } from '@/hooks/use-toast';
import { createNotificationFromTemplate } from '@/hooks/use-notification';
import {
  getCurrentDate,
  getCurrentDateTime,
  calculateWorkHours,
  determineAttendanceStatus,
  isLateCheckIn,
  calculateLateMinutes,
  getMonthDateRange,
  countWorkingDaysInMonth,
  calculateAttendanceSummary,
  type AttendanceStatus,
} from '@/lib/attendance-utils';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const ATTENDANCE_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_ATTENDANCE_COLLECTION_ID!;

export interface Attendance {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  userId: string;
  workspaceId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  workHours?: number;
  status: AttendanceStatus;
  lateMinutes?: number;
  location?: string;
  notes?: string;
}

export function useTodayAttendance(userId?: string, workspaceId?: string) {
  const today = getCurrentDate();
  return useQuery({
    queryKey: ['attendance', 'today', userId, workspaceId, today],
    queryFn: async () => {
      if (!userId) return null;

      const queries = [
        Query.equal('userId', userId),
        Query.equal('date', today)
      ];

      // Add workspaceId filter if provided
      if (workspaceId) {
        queries.push(Query.equal('workspaceId', workspaceId));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        ATTENDANCE_COLLECTION_ID,
        queries
      );
      if (response.documents.length === 0) return null;
      return response.documents[0] as unknown as Attendance;
    },
    enabled: !!userId,
    refetchInterval: 60000,
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      userId: string;
      workspaceId: string;
      location?: string;
      notes?: string
    }) => {
      if (!data.workspaceId) {
        throw new Error('Workspace ID is required. Please select a workspace first.');
      }

      const now = getCurrentDateTime();
      const date = getCurrentDate();
      const existing = await databases.listDocuments(
        DATABASE_ID,
        ATTENDANCE_COLLECTION_ID,
        [Query.equal('userId', data.userId), Query.equal('date', date)]
      );
      if (existing.documents.length > 0) {
        const record = existing.documents[0] as any;
        if (!record.checkOutTime) throw new Error('You have already checked in today');
      }
      const isLate = isLateCheckIn(now);
      const lateMinutes = isLate ? calculateLateMinutes(now) : 0;
      const attendance = await databases.createDocument(
        DATABASE_ID,
        ATTENDANCE_COLLECTION_ID,
        ID.unique(),
        {
          userId: data.userId,
          workspaceId: data.workspaceId,
          date,
          checkInTime: now,
          status: isLate ? 'LATE' : 'PRESENT',
          lateMinutes,
          location: data.location || '',
          notes: data.notes || '',
        }
      );
      return attendance as unknown as Attendance;
    },
    onSuccess: async (attendance, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });

      // Send notification if user checked in late
      const isLate = attendance.status === 'LATE';
      if (isLate) {
        await createNotificationFromTemplate({
          workspaceId: variables.workspaceId,
          userId: attendance.userId,
          type: 'ATTENDANCE_LATE',
          data: {
            checkInTime: new Date(attendance.checkInTime).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            lateMinutes: attendance.lateMinutes || 0,
            date: attendance.date,
            entityType: 'ATTENDANCE',
          },
        });
      }

      toast({ title: 'Checked In', description: 'You have successfully checked in for today.' });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || 'Failed to check in';
      let description = errorMessage;

      // Provide specific guidance based on error
      if (errorMessage.includes('already checked in')) {
        description = 'You have already checked in today. Please check out first if you need to check in again.';
      } else if (errorMessage.includes('Workspace ID')) {
        description = 'Please select a workspace before checking in.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        description = 'Network error. Please check your internet connection and try again.';
      }

      toast({
        title: 'Check-in Failed',
        description,
        variant: 'destructive'
      });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { attendanceId: string; notes?: string }) => {
      const now = getCurrentDateTime();
      const record = (await databases.getDocument(DATABASE_ID, ATTENDANCE_COLLECTION_ID, data.attendanceId)) as any;
      if (record.checkOutTime) throw new Error('You have already checked out');
      const workHours = calculateWorkHours(record.checkInTime, now);
      const status = determineAttendanceStatus(record.checkInTime, now, workHours);
      const updated = await databases.updateDocument(
        DATABASE_ID,
        ATTENDANCE_COLLECTION_ID,
        data.attendanceId,
        {
          checkOutTime: now,
          workHours,
          status,
          notes: data.notes ? `${record.notes || ''}\n${data.notes}`.trim() : record.notes,
        }
      );
      return updated as unknown as Attendance;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({ title: 'Checked Out', description: `You worked ${data.workHours?.toFixed(1)} hours today.` });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || 'Failed to check out';
      let description = errorMessage;

      // Provide specific guidance based on error
      if (errorMessage.includes('already checked out')) {
        description = 'You have already checked out for today.';
      } else if (errorMessage.includes('not checked in')) {
        description = 'You must check in before you can check out.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        description = 'Network error. Please check your internet connection and try again.';
      }

      toast({
        title: 'Check-out Failed',
        description,
        variant: 'destructive'
      });
    },
  });
}

export function useMonthlyAttendance(userId?: string, workspaceId?: string, year?: number, month?: number) {
  const currentDate = new Date();
  const targetYear = year ?? currentDate.getFullYear();
  const targetMonth = month ?? currentDate.getMonth();
  const { start, end } = getMonthDateRange(targetYear, targetMonth);
  return useQuery({
    queryKey: ['attendance', 'monthly', userId, workspaceId, targetYear, targetMonth],
    queryFn: async () => {
      if (!userId) return [];

      const queries = [
        Query.equal('userId', userId),
        Query.greaterThanEqual('date', start),
        Query.lessThanEqual('date', end),
        Query.orderDesc('date'),
      ];

      // Add workspaceId filter if provided
      if (workspaceId) {
        queries.push(Query.equal('workspaceId', workspaceId));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        ATTENDANCE_COLLECTION_ID,
        queries
      );
      return response.documents as unknown as Attendance[];
    },
    enabled: !!userId,
    refetchInterval: 60000, // Refetch every minute for real-time updates
  });
}

export function useAttendanceAnalytics(userId?: string, workspaceId?: string, year?: number, month?: number) {
  const currentDate = new Date();
  const targetYear = year ?? currentDate.getFullYear();
  const targetMonth = month ?? currentDate.getMonth();
  return useQuery({
    queryKey: ['attendance', 'analytics', userId, workspaceId, targetYear, targetMonth],
    queryFn: async () => {
      if (!userId) return null;
      const { start, end } = getMonthDateRange(targetYear, targetMonth);

      const queries = [
        Query.equal('userId', userId),
        Query.greaterThanEqual('date', start),
        Query.lessThanEqual('date', end)
      ];

      // Add workspaceId filter if provided
      if (workspaceId) {
        queries.push(Query.equal('workspaceId', workspaceId));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        ATTENDANCE_COLLECTION_ID,
        queries
      );
      const records = response.documents as any[];
      const workingDays = countWorkingDaysInMonth(targetYear, targetMonth);
      const summary = calculateAttendanceSummary(records, workingDays);
      return { ...summary, records, period: { year: targetYear, month: targetMonth, start, end } };
    },
    enabled: !!userId,
    refetchInterval: 60000, // Refetch every minute for real-time updates
  });
}
