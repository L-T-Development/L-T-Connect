'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query } from 'appwrite';
import type { TimeEntry, ActiveTimer, TimeEntryStatus } from '@/types';
import { toast } from 'sonner';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const TIME_ENTRIES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_TIME_ENTRIES_ID || 'time_entries';
const ACTIVE_TIMERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ACTIVE_TIMERS_ID || 'active_timers';

// ============================================
// QUERIES
// ============================================

/**
 * Get all time entries for a user
 */
export function useTimeEntries(userId?: string, filters?: {
  workspaceId?: string;
  taskId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  status?: TimeEntryStatus;
}) {
  return useQuery({
    queryKey: ['time-entries', userId, filters],
    queryFn: async () => {
      if (!userId) return [];

      const queries = [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt'),
      ];

      if (filters?.workspaceId) {
        queries.push(Query.equal('workspaceId', filters.workspaceId));
      }

      if (filters?.taskId) {
        queries.push(Query.equal('taskId', filters.taskId));
      }

      if (filters?.projectId) {
        queries.push(Query.equal('projectId', filters.projectId));
      }

      if (filters?.status) {
        queries.push(Query.equal('status', filters.status));
      }

      if (filters?.startDate) {
        queries.push(Query.greaterThanEqual('startTime', filters.startDate));
      }

      if (filters?.endDate) {
        queries.push(Query.lessThanEqual('endTime', filters.endDate));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        TIME_ENTRIES_COLLECTION_ID,
        queries
      );

      return response.documents as unknown as TimeEntry[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get time entries for a specific task
 */
export function useTaskTimeEntries(taskId?: string) {
  return useQuery({
    queryKey: ['time-entries', 'task', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const response = await databases.listDocuments(
        DATABASE_ID,
        TIME_ENTRIES_COLLECTION_ID,
        [
          Query.equal('taskId', taskId),
          Query.orderDesc('$createdAt'),
        ]
      );

      return response.documents as unknown as TimeEntry[];
    },
    enabled: !!taskId,
  });
}

/**
 * Get active timer for a user
 */
export function useActiveTimer(userId?: string) {
  return useQuery({
    queryKey: ['active-timer', userId],
    queryFn: async () => {
      if (!userId) return null;

      const response = await databases.listDocuments(
        DATABASE_ID,
        ACTIVE_TIMERS_COLLECTION_ID,
        [Query.equal('userId', userId)]
      );

      if (response.documents.length === 0) return null;

      return response.documents[0] as unknown as ActiveTimer;
    },
    enabled: !!userId,
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: 1000 * 30, // Refetch every 30 seconds to keep timer updated
  });
}

/**
 * Get pending time entries for approval (managers)
 */
export function usePendingTimeEntries(workspaceId?: string) {
  return useQuery({
    queryKey: ['time-entries', 'pending', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const response = await databases.listDocuments(
        DATABASE_ID,
        TIME_ENTRIES_COLLECTION_ID,
        [
          Query.equal('workspaceId', workspaceId),
          Query.equal('status', 'PENDING'),
          Query.orderDesc('$createdAt'),
        ]
      );

      return response.documents as unknown as TimeEntry[];
    },
    enabled: !!workspaceId,
  });
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a manual time entry
 */
export function useCreateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      userId: string;
      userName: string;
      userEmail: string;
      taskId?: string;
      taskTitle?: string;
      taskHierarchyId?: string;
      projectId?: string;
      projectName?: string;
      description: string;
      startTime: string;
      endTime: string;
      duration: number;
      isBillable: boolean;
      billableRate?: number;
      tags?: string[];
    }) => {
      const timeEntry = await databases.createDocument(
        DATABASE_ID,
        TIME_ENTRIES_COLLECTION_ID,
        'unique()',
        {
          ...data,
          type: 'MANUAL',
          status: 'PENDING',
          tags: data.tags ? JSON.stringify(data.tags) : '[]',
        }
      );

      return timeEntry as unknown as TimeEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'task', variables.taskId] });
      toast.success('Time entry created successfully');
    },
    onError: (error: any) => {
      console.error('Failed to create time entry:', error);
      toast.error(error.message || 'Failed to create time entry');
    },
  });
}

/**
 * Start a timer
 */
export function useStartTimer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      taskId?: string;
      taskTitle?: string;
      taskHierarchyId?: string;
      projectId?: string;
      description: string;
      type?: 'TIMER' | 'POMODORO';
      pomodoroSettings?: ActiveTimer['pomodoroSettings'];
    }) => {
      // Check if there's already an active timer
      const existingTimers = await databases.listDocuments(
        DATABASE_ID,
        ACTIVE_TIMERS_COLLECTION_ID,
        [Query.equal('userId', data.userId)]
      );

      // Delete existing timer if any
      if (existingTimers.documents.length > 0) {
        await databases.deleteDocument(
          DATABASE_ID,
          ACTIVE_TIMERS_COLLECTION_ID,
          existingTimers.documents[0].$id
        );
      }

      const timer = await databases.createDocument(
        DATABASE_ID,
        ACTIVE_TIMERS_COLLECTION_ID,
        'unique()',
        {
          ...data,
          startTime: new Date().toISOString(),
          isPaused: false,
          totalPausedTime: 0,
          type: data.type || 'TIMER',
          pomodoroSettings: data.pomodoroSettings ? JSON.stringify(data.pomodoroSettings) : null,
        }
      );

      return timer as unknown as ActiveTimer;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['active-timer', variables.userId] });
      toast.success('Timer started');
    },
    onError: (error: any) => {
      console.error('Failed to start timer:', error);
      toast.error(error.message || 'Failed to start timer');
    },
  });
}

/**
 * Pause/Resume timer
 */
export function useToggleTimer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      timerId: string;
      userId: string;
      isPaused: boolean;
      pausedAt?: string;
      totalPausedTime?: number;
    }) => {
      const { timerId, userId, ...updateData } = data;

      const timer = await databases.updateDocument(
        DATABASE_ID,
        ACTIVE_TIMERS_COLLECTION_ID,
        timerId,
        updateData
      );

      return timer as unknown as ActiveTimer;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['active-timer', variables.userId] });
      toast.success(variables.isPaused ? 'Timer paused' : 'Timer resumed');
    },
    onError: (error: any) => {
      console.error('Failed to toggle timer:', error);
      toast.error(error.message || 'Failed to toggle timer');
    },
  });
}

/**
 * Stop timer and create time entry
 */
export function useStopTimer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      timerId: string;
      userId: string;
      workspaceId: string;
      userName: string;
      userEmail: string;
      taskId?: string;
      taskTitle?: string;
      taskHierarchyId?: string;
      projectId?: string;
      projectName?: string;
      description: string;
      startTime: string;
      totalPausedTime: number;
      isBillable: boolean;
      billableRate?: number;
      type: 'TIMER' | 'POMODORO';
    }) => {
      const endTime = new Date().toISOString();
      const startTime = new Date(data.startTime);
      const endTimeDate = new Date(endTime);
      
      // Calculate duration in minutes (excluding paused time)
      const totalMinutes = Math.floor((endTimeDate.getTime() - startTime.getTime()) / 1000 / 60);
      const duration = Math.max(0, totalMinutes - data.totalPausedTime);

      // Create time entry
      const timeEntry = await databases.createDocument(
        DATABASE_ID,
        TIME_ENTRIES_COLLECTION_ID,
        'unique()',
        {
          workspaceId: data.workspaceId,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          taskId: data.taskId || null,
          taskTitle: data.taskTitle || null,
          taskHierarchyId: data.taskHierarchyId || null,
          projectId: data.projectId || null,
          projectName: data.projectName || null,
          description: data.description,
          startTime: data.startTime,
          endTime,
          duration,
          isBillable: data.isBillable,
          billableRate: data.billableRate || null,
          type: data.type,
          status: 'PENDING',
          tags: '[]',
        }
      );

      // Delete active timer
      await databases.deleteDocument(
        DATABASE_ID,
        ACTIVE_TIMERS_COLLECTION_ID,
        data.timerId
      );

      return timeEntry as unknown as TimeEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['active-timer', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['time-entries', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'task', variables.taskId] });
      toast.success('Timer stopped and time entry created');
    },
    onError: (error: any) => {
      console.error('Failed to stop timer:', error);
      toast.error(error.message || 'Failed to stop timer');
    },
  });
}

/**
 * Update time entry
 */
export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      userId: string;
      updates: Partial<TimeEntry>;
    }) => {
      const { id, updates } = data;

      const timeEntry = await databases.updateDocument(
        DATABASE_ID,
        TIME_ENTRIES_COLLECTION_ID,
        id,
        updates
      );

      return timeEntry as unknown as TimeEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', variables.userId] });
      toast.success('Time entry updated');
    },
    onError: (error: any) => {
      console.error('Failed to update time entry:', error);
      toast.error(error.message || 'Failed to update time entry');
    },
  });
}

/**
 * Delete time entry
 */
export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; userId: string }) => {
      await databases.deleteDocument(
        DATABASE_ID,
        TIME_ENTRIES_COLLECTION_ID,
        data.id
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', variables.userId] });
      toast.success('Time entry deleted');
    },
    onError: (error: any) => {
      console.error('Failed to delete time entry:', error);
      toast.error(error.message || 'Failed to delete time entry');
    },
  });
}

/**
 * Approve time entry (managers)
 */
export function useApproveTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      workspaceId: string;
      approvedBy: string;
    }) => {
      const timeEntry = await databases.updateDocument(
        DATABASE_ID,
        TIME_ENTRIES_COLLECTION_ID,
        data.id,
        {
          status: 'APPROVED',
          approvedBy: data.approvedBy,
          approvedAt: new Date().toISOString(),
        }
      );

      return timeEntry as unknown as TimeEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'pending', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Time entry approved');
    },
    onError: (error: any) => {
      console.error('Failed to approve time entry:', error);
      toast.error(error.message || 'Failed to approve time entry');
    },
  });
}

/**
 * Reject time entry (managers)
 */
export function useRejectTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      workspaceId: string;
      rejectionReason: string;
    }) => {
      const timeEntry = await databases.updateDocument(
        DATABASE_ID,
        TIME_ENTRIES_COLLECTION_ID,
        data.id,
        {
          status: 'REJECTED',
          rejectionReason: data.rejectionReason,
        }
      );

      return timeEntry as unknown as TimeEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', 'pending', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Time entry rejected');
    },
    onError: (error: any) => {
      console.error('Failed to reject time entry:', error);
      toast.error(error.message || 'Failed to reject time entry');
    },
  });
}
