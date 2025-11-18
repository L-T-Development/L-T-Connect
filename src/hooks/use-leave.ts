import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query, ID } from 'appwrite';
import { toast } from '@/hooks/use-toast';
import { createNotificationFromTemplate } from '@/hooks/use-notification';
import {
  calculateLeaveDays,
  hasEnoughBalance,
  calculateRemainingBalance,
  initializeLeaveBalance,
  type LeaveType,
  type LeaveStatus,
} from '@/lib/leave-utils';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const LEAVE_REQUESTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_LEAVE_REQUESTS_COLLECTION_ID!;
const LEAVE_BALANCES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_LEAVE_BALANCES_COLLECTION_ID!;
const USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;

// ============================================================================
// Types
// ============================================================================

export interface LeaveRequest {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  halfDay: boolean;
  reason: string;
  status: LeaveStatus;
  approverId?: string;
  approverName?: string;
  approverComments?: string;
  approvedAt?: string;
  emergencyContact?: string;
  document?: string;
}

export interface LeaveBalance {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  userId: string;
  leaveBalances: Record<LeaveType, number>;
  lastResetDate?: string;
}

// ============================================================================
// Leave Requests
// ============================================================================

/**
 * Get all leave requests for a user
 */
export function useLeaveRequests(userId?: string, status?: LeaveStatus) {
  return useQuery({
    queryKey: ['leaveRequests', userId, status],
    queryFn: async () => {
      if (!userId) return [];

      const queries = [Query.equal('userId', userId), Query.orderDesc('$createdAt')];

      if (status) {
        queries.push(Query.equal('status', status));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        LEAVE_REQUESTS_COLLECTION_ID,
        queries
      );

      return response.documents as unknown as LeaveRequest[];
    },
    enabled: !!userId,
  });
}

/**
 * Get all leave requests for team (managers view)
 */
export function useTeamLeaveRequests(workspaceId?: string, status?: LeaveStatus) {
  return useQuery({
    queryKey: ['teamLeaveRequests', workspaceId, status],
    queryFn: async () => {
      if (!workspaceId) return [];

      const queries = [Query.orderDesc('$createdAt'), Query.limit(100)];

      if (status) {
        queries.push(Query.equal('status', status));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        LEAVE_REQUESTS_COLLECTION_ID,
        queries
      );

      // Fetch user details for each leave request
      const requestsWithUserDetails = await Promise.all(
        response.documents.map(async (request: any) => {
          try {
            const user = await databases.getDocument(
              DATABASE_ID,
              USERS_COLLECTION_ID,
              request.userId
            );
            return {
              ...request,
              userName: user.name,
              userEmail: user.email,
            };
          } catch {
            return request;
          }
        })
      );

      return requestsWithUserDetails as unknown as LeaveRequest[];
    },
    enabled: !!workspaceId,
  });
}

/**
 * Create a new leave request
 */
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId?: string;
      userId: string;
      leaveType: LeaveType;
      startDate: string;
      endDate: string;
      reason: string;
      halfDay?: boolean;
      emergencyContact?: string;
      document?: string;
      createdBy?: string;
      createdByName?: string;
    }) => {
      // Calculate leave days
      const days = calculateLeaveDays(data.startDate, data.endDate, data.halfDay);

      // Check leave balance
      const balanceQuery = await databases.listDocuments(
        DATABASE_ID,
        LEAVE_BALANCES_COLLECTION_ID,
        [Query.equal('userId', data.userId)]
      );

      if (balanceQuery.documents.length === 0) {
        // Initialize leave balance if it doesn't exist
        const initialBalance = initializeLeaveBalance();
        await databases.createDocument(
          DATABASE_ID,
          LEAVE_BALANCES_COLLECTION_ID,
          ID.unique(),
          {
            userId: data.userId,
            leaveBalances: JSON.stringify(initialBalance),
            lastResetDate: new Date().toISOString(),
          }
        );
      }

      // Get current balance
      const balanceDoc = balanceQuery.documents[0] as any;
      const currentBalance =
        typeof balanceDoc?.leaveBalances === 'string'
          ? JSON.parse(balanceDoc.leaveBalances)
          : balanceDoc?.leaveBalances || initializeLeaveBalance();

      // Check if enough balance
      if (!hasEnoughBalance(data.leaveType, days, currentBalance)) {
        throw new Error(
          `Insufficient leave balance. You need ${days} days but have ${currentBalance[data.leaveType]} days remaining.`
        );
      }

      // Create leave request
      const leaveRequest = await databases.createDocument(
        DATABASE_ID,
        LEAVE_REQUESTS_COLLECTION_ID,
        ID.unique(),
        {
          workspaceId: data.workspaceId || '',
          userId: data.userId,
          leaveType: data.leaveType,
          startDate: data.startDate,
          endDate: data.endDate,
          days,
          halfDay: data.halfDay || false,
          reason: data.reason,
          status: 'PENDING',
          emergencyContact: data.emergencyContact || '',
          document: data.document || '',
          createdBy: data.createdBy || data.userId,
          createdByName: data.createdByName || '',
        }
      );

      return leaveRequest as unknown as LeaveRequest;
    },
    onSuccess: async (_leaveRequest, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['teamLeaveRequests'] });
      
      // TODO: Notify managers about new leave request
      // For now, we'll need to pass managerIds from the component
      // await createBulkNotifications({
      //   workspaceId: leaveRequest.workspaceId || '',
      //   userIds: managerIds,
      //   type: 'LEAVE_REQUESTED',
      //   data: {
      //     leaveId: leaveRequest.$id,
      //     employeeName: 'Employee Name',
      //     leaveType: variables.leaveType,
      //     days: calculateLeaveDays(variables.startDate, variables.endDate, variables.halfDay),
      //     entityType: 'LEAVE',
      //   },
      // });
      
      toast({
        title: 'Leave Request Submitted',
        description: 'Your leave request has been submitted for approval.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit leave request',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Approve leave request
 */
export function useApproveLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      leaveRequestId: string;
      approverId: string;
      approverName: string;
      approverComments?: string;
    }) => {
      // Get leave request details
      const leaveRequest = (await databases.getDocument(
        DATABASE_ID,
        LEAVE_REQUESTS_COLLECTION_ID,
        data.leaveRequestId
      )) as any;

      // Update leave request status
      const updatedRequest = await databases.updateDocument(
        DATABASE_ID,
        LEAVE_REQUESTS_COLLECTION_ID,
        data.leaveRequestId,
        {
          status: 'APPROVED',
          approverId: data.approverId,
          approverName: data.approverName,
          approverComments: data.approverComments || '',
          approvedAt: new Date().toISOString(),
        }
      );

      // Update leave balance
      const balanceQuery = await databases.listDocuments(
        DATABASE_ID,
        LEAVE_BALANCES_COLLECTION_ID,
        [Query.equal('userId', leaveRequest.userId)]
      );

      if (balanceQuery.documents.length > 0) {
        const balanceDoc = balanceQuery.documents[0] as any;
        const currentBalance =
          typeof balanceDoc.leaveBalances === 'string'
            ? JSON.parse(balanceDoc.leaveBalances)
            : balanceDoc.leaveBalances;

        const newBalance = calculateRemainingBalance(
          leaveRequest.leaveType,
          leaveRequest.days,
          currentBalance
        );

        const updatedBalances = {
          ...currentBalance,
          [leaveRequest.leaveType]: newBalance,
        };

        await databases.updateDocument(
          DATABASE_ID,
          LEAVE_BALANCES_COLLECTION_ID,
          balanceDoc.$id,
          {
            leaveBalances: JSON.stringify(updatedBalances),
          }
        );
      }

      // Get user email
      const user = await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        leaveRequest.userId
      );

      // Send approval email via API route
      const emailResponse = await fetch('/api/send-leave-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'approval',
          to: (user as any).email,
          employeeName: (user as any).name,
          leaveType: leaveRequest.leaveType,
          startDate: new Date(leaveRequest.startDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          endDate: new Date(leaveRequest.endDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          days: leaveRequest.days,
          approverName: data.approverName,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send approval email:', await emailResponse.text());
      }

      return updatedRequest as unknown as LeaveRequest;
    },
    onSuccess: async (_leaveRequest, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['teamLeaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
      
      // Get leave request details from DB
      const leaveDoc = await databases.getDocument(
        DATABASE_ID,
        LEAVE_REQUESTS_COLLECTION_ID,
        variables.leaveRequestId
      ) as any;
      
      // Send in-app notification to employee
      await createNotificationFromTemplate({
        workspaceId: leaveDoc.workspaceId || '',
        userId: leaveDoc.userId,
        type: 'LEAVE_APPROVED',
        data: {
          leaveId: leaveDoc.$id,
          leaveType: leaveDoc.leaveType,
          days: leaveDoc.days,
          approverName: variables.approverName,
          entityType: 'LEAVE',
        },
      });
      
      toast({
        title: 'Leave Approved',
        description: 'Leave request has been approved and the employee has been notified.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve leave request',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Reject leave request
 */
export function useRejectLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      leaveRequestId: string;
      approverId: string;
      approverName: string;
      rejectionReason: string;
    }) => {
      // Get leave request details
      const leaveRequest = (await databases.getDocument(
        DATABASE_ID,
        LEAVE_REQUESTS_COLLECTION_ID,
        data.leaveRequestId
      )) as any;

      // Update leave request status
      const updatedRequest = await databases.updateDocument(
        DATABASE_ID,
        LEAVE_REQUESTS_COLLECTION_ID,
        data.leaveRequestId,
        {
          status: 'REJECTED',
          approverId: data.approverId,
          approverName: data.approverName,
          approverComments: data.rejectionReason,
          approvedAt: new Date().toISOString(),
        }
      );

      // Get user email
      const user = await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        leaveRequest.userId
      );

      // Send rejection email via API route
      const emailResponse = await fetch('/api/send-leave-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'rejection',
          to: (user as any).email,
          employeeName: (user as any).name,
          leaveType: leaveRequest.leaveType,
          startDate: new Date(leaveRequest.startDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          endDate: new Date(leaveRequest.endDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          days: leaveRequest.days,
          rejectionReason: data.rejectionReason,
          approverName: data.approverName,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send rejection email:', await emailResponse.text());
      }

      return updatedRequest as unknown as LeaveRequest;
    },
    onSuccess: async (_leaveRequest, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['teamLeaveRequests'] });
      
      // Get leave request details from DB
      const leaveDoc = await databases.getDocument(
        DATABASE_ID,
        LEAVE_REQUESTS_COLLECTION_ID,
        variables.leaveRequestId
      ) as any;
      
      // Send in-app notification to employee
      await createNotificationFromTemplate({
        workspaceId: leaveDoc.workspaceId || '',
        userId: leaveDoc.userId,
        type: 'LEAVE_REJECTED',
        data: {
          leaveId: leaveDoc.$id,
          leaveType: leaveDoc.leaveType,
          days: leaveDoc.days,
          reason: variables.rejectionReason,
          entityType: 'LEAVE',
        },
      });
      
      toast({
        title: 'Leave Rejected',
        description: 'Leave request has been rejected and the employee has been notified.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject leave request',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Cancel leave request
 */
export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leaveRequestId: string) => {
      // Get leave request to restore balance if approved
      const leaveRequest = (await databases.getDocument(
        DATABASE_ID,
        LEAVE_REQUESTS_COLLECTION_ID,
        leaveRequestId
      )) as any;

      // Update status
      await databases.updateDocument(
        DATABASE_ID,
        LEAVE_REQUESTS_COLLECTION_ID,
        leaveRequestId,
        {
          status: 'CANCELLED',
        }
      );

      // If leave was approved, restore the balance
      if (leaveRequest.status === 'APPROVED') {
        const balanceQuery = await databases.listDocuments(
          DATABASE_ID,
          LEAVE_BALANCES_COLLECTION_ID,
          [Query.equal('userId', leaveRequest.userId)]
        );

        if (balanceQuery.documents.length > 0) {
          const balanceDoc = balanceQuery.documents[0] as any;
          const currentBalance =
            typeof balanceDoc.leaveBalances === 'string'
              ? JSON.parse(balanceDoc.leaveBalances)
              : balanceDoc.leaveBalances;

          const restoredBalances = {
            ...currentBalance,
            [leaveRequest.leaveType]:
              (currentBalance[leaveRequest.leaveType] || 0) + leaveRequest.days,
          };

          await databases.updateDocument(
            DATABASE_ID,
            LEAVE_BALANCES_COLLECTION_ID,
            balanceDoc.$id,
            {
              leaveBalances: JSON.stringify(restoredBalances),
            }
          );
        }
      }

      return leaveRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
      toast({
        title: 'Leave Cancelled',
        description: 'Your leave request has been cancelled.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel leave request',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Leave Balance
// ============================================================================

/**
 * Get user's leave balance
 */
export function useLeaveBalance(userId?: string) {
  return useQuery({
    queryKey: ['leaveBalance', userId],
    queryFn: async () => {
      if (!userId) return null;

      const response = await databases.listDocuments(
        DATABASE_ID,
        LEAVE_BALANCES_COLLECTION_ID,
        [Query.equal('userId', userId)]
      );

      if (response.documents.length === 0) {
        // Initialize leave balance
        const initialBalance = initializeLeaveBalance();
        const newBalance = await databases.createDocument(
          DATABASE_ID,
          LEAVE_BALANCES_COLLECTION_ID,
          ID.unique(),
          {
            userId,
            leaveBalances: JSON.stringify(initialBalance),
            lastResetDate: new Date().toISOString(),
          }
        );

        return {
          ...newBalance,
          leaveBalances: initialBalance,
        } as unknown as LeaveBalance;
      }

      const balanceDoc = response.documents[0] as any;
      return {
        ...balanceDoc,
        leaveBalances:
          typeof balanceDoc.leaveBalances === 'string'
            ? JSON.parse(balanceDoc.leaveBalances)
            : balanceDoc.leaveBalances,
      } as unknown as LeaveBalance;
    },
    enabled: !!userId,
  });
}
