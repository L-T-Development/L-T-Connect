import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query, ID } from 'appwrite';
import { toast } from '@/hooks/use-toast';
import { createNotificationFromTemplate } from '@/hooks/use-notification';
import {
  calculateLeaveDays,
  hasEnoughBalance,
  initializeLeaveBalance,
  type LeaveType,
  type LeaveStatus,
} from '@/lib/leave-utils';
import { getBalanceFieldForLeaveType } from '@/lib/leave-balance-mapper';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const LEAVE_REQUESTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_LEAVE_REQUESTS_COLLECTION_ID!;
const LEAVE_BALANCES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_LEAVE_BALANCES_COLLECTION_ID!;
const USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;

// ============================================================================
// Types
// ============================================================================

/**
 * Helper: Map Appwrite document to LeaveRequest
 * Appwrite DB uses "type" but our TypeScript interface uses "leaveType"
 * Appwrite DB uses "daysCount" but our TypeScript interface uses "days"
 */
function mapToLeaveRequest(doc: any): LeaveRequest {
  return {
    ...doc,
    leaveType: doc.type,
    days: doc.daysCount,
  };
}

export interface LeaveRequest {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  workspaceId?: string; // Workspace ID for multi-tenant support
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
  workspaceId: string;
  userId: string;
  year: number;
  paidLeave: number;
  unpaidLeave: number;
  halfDay: number;
  compOff: number;
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

      return response.documents.map(mapToLeaveRequest);
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

      return requestsWithUserDetails.map(mapToLeaveRequest);
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
      // Calculate leave days - enforce full-day for non-HALF_DAY types
      const days = calculateLeaveDays(data.startDate, data.endDate, data.halfDay, data.leaveType);

      // Check leave balance (retrieve from DB in correct format)
      const currentYear = new Date().getFullYear();
      const balanceQuery = await databases.listDocuments(
        DATABASE_ID,
        LEAVE_BALANCES_COLLECTION_ID,
        [
          Query.equal('userId', data.userId),
          Query.equal('workspaceId', data.workspaceId || ''),
          Query.equal('year', currentYear)
        ]
      );

      let balanceDoc: any;
      
      if (balanceQuery.documents.length === 0) {
        // Initialize leave balance if it doesn't exist
        const initialBalance = initializeLeaveBalance();
        balanceDoc = await databases.createDocument(
          DATABASE_ID,
          LEAVE_BALANCES_COLLECTION_ID,
          ID.unique(),
          {
            workspaceId: data.workspaceId || '',
            userId: data.userId,
            year: currentYear,
            ...initialBalance, // paidLeave, unpaidLeave, halfDay, compOff
          }
        );
      } else {
        balanceDoc = balanceQuery.documents[0];
      }

      // Get current balance (DB schema: paidLeave, unpaidLeave, halfDay, compOff)
      const currentBalance = {
        paidLeave: balanceDoc.paidLeave || 0,
        unpaidLeave: balanceDoc.unpaidLeave || 0,
        halfDay: balanceDoc.halfDay || 0,
        compOff: balanceDoc.compOff || 0,
      };

      // Check if enough balance using the mapper
      const balanceField = getBalanceFieldForLeaveType(data.leaveType);
      const availableBalance = currentBalance[balanceField];
      
      if (!hasEnoughBalance(data.leaveType, days, currentBalance)) {
        throw new Error(
          `Insufficient leave balance. You need ${days} days but have ${availableBalance} days remaining.`
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
          type: data.leaveType,
          startDate: data.startDate,
          endDate: data.endDate,
          daysCount: days,
          reason: data.reason,
          status: 'PENDING',
          createdBy: data.createdBy || data.userId,
          createdByName: data.createdByName || '',
        }
      );

      return mapToLeaveRequest(leaveRequest);
    },
    onSuccess: async (leaveRequest, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['teamLeaveRequests'] });

      // Notify managers about new leave request
      if (variables.workspaceId) {
        try {
          // Query workspace members to find managers/admins
          const WORKSPACE_MEMBERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_WORKSPACE_MEMBERS_ID!;
          const membersResponse = await databases.listDocuments(
            DATABASE_ID,
            WORKSPACE_MEMBERS_COLLECTION_ID,
            [Query.equal('workspaceId', variables.workspaceId)]
          );

          // Filter for managers and admins
          const managers = membersResponse.documents
            .filter((member: any) => {
              const role = member.role?.toLowerCase() || '';
              return role.includes('manager') || role.includes('admin') || role === 'owner';
            })
            .map((member: any) => member.userId)
            .filter((userId: string) => userId && userId !== variables.userId); // Exclude the requester

          // Send notifications to managers
          if (managers.length > 0) {
            const { createBulkNotifications } = await import('@/hooks/use-notification');
            await createBulkNotifications({
              workspaceId: variables.workspaceId,
              userIds: managers,
              type: 'LEAVE_REQUESTED',
              data: {
                leaveId: leaveRequest.$id,
                employeeName: variables.createdByName || 'Employee',
                leaveType: variables.leaveType,
                days: calculateLeaveDays(variables.startDate, variables.endDate, variables.halfDay, variables.leaveType),
                startDate: variables.startDate,
                endDate: variables.endDate,
                entityType: 'LEAVE',
              },
            });
          }
        } catch (error) {
          // Don't fail the leave request if notification fails
          console.error('Failed to notify managers:', error);
        }
      }

      toast({
        title: 'Leave Request Submitted',
        description: 'Your leave request has been submitted for approval.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to submit leave request',
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
      const leaveRequestDoc = await databases.getDocument(
        DATABASE_ID,
        LEAVE_REQUESTS_COLLECTION_ID,
        data.leaveRequestId
      );
      const leaveRequest = mapToLeaveRequest(leaveRequestDoc);

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

      // Update leave balance using the mapping layer
      // THIS IS WHERE THE MAGIC HAPPENS - we use the mapper to know which field to update
      const currentYear = new Date().getFullYear();
      const balanceQuery = await databases.listDocuments(
        DATABASE_ID,
        LEAVE_BALANCES_COLLECTION_ID,
        [
          Query.equal('userId', leaveRequest.userId),
          Query.equal('workspaceId', leaveRequest.workspaceId || ''),
          Query.equal('year', currentYear)
        ]
      );

      if (balanceQuery.documents.length > 0) {
        const balanceDoc = balanceQuery.documents[0] as any;
        
        // Get which DB field to update based on leave type
        const balanceField = getBalanceFieldForLeaveType(leaveRequest.leaveType);
        
        // Calculate deduction amount (ALL FIELDS ARE INTEGER)
        // HALF_DAY leave type: always deduct 1 unit (one half-day session)
        // Other types: deduct full days (ceiling to handle any edge cases)
        const deductionAmount = leaveRequest.leaveType === 'HALF_DAY' 
          ? 1 
          : Math.ceil(leaveRequest.days);
        
        // Calculate new balance
        const currentFieldValue = balanceDoc[balanceField] || 0;
        const newFieldValue = Math.max(0, currentFieldValue - deductionAmount);

        // Update ONLY the relevant balance field
        const updateData: any = {};
        updateData[balanceField] = newFieldValue;

        await databases.updateDocument(
          DATABASE_ID,
          LEAVE_BALANCES_COLLECTION_ID,
          balanceDoc.$id,
          updateData
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

      return mapToLeaveRequest(updatedRequest);
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
          leaveType: leaveDoc.type,
          days: leaveDoc.daysCount,
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
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to approve leave request',
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
      const leaveRequestDoc = await databases.getDocument(
        DATABASE_ID,
        LEAVE_REQUESTS_COLLECTION_ID,
        data.leaveRequestId
      );
      const leaveRequest = mapToLeaveRequest(leaveRequestDoc);

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

      return mapToLeaveRequest(updatedRequest);
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
          leaveType: leaveDoc.type,
          days: leaveDoc.daysCount,
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
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to reject leave request',
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
      const leaveRequestDoc = await databases.getDocument(
        DATABASE_ID,
        LEAVE_REQUESTS_COLLECTION_ID,
        leaveRequestId
      );
      const leaveRequest = mapToLeaveRequest(leaveRequestDoc);

      // Validate: Prevent cancellation of past or ongoing leaves
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day

      const leaveStartDate = new Date(leaveRequest.startDate);
      leaveStartDate.setHours(0, 0, 0, 0);

      if (leaveStartDate <= today) {
        throw new Error(
          'Cannot cancel leave that has already started or is in the past. Please contact your manager for assistance.'
        );
      }

      // Update status
      await databases.updateDocument(
        DATABASE_ID,
        LEAVE_REQUESTS_COLLECTION_ID,
        leaveRequestId,
        {
          status: 'CANCELLED',
        }
      );

      // If leave was approved, restore the balance using the mapper
      if (leaveRequest.status === 'APPROVED') {
        const currentYear = new Date().getFullYear();
        const balanceQuery = await databases.listDocuments(
          DATABASE_ID,
          LEAVE_BALANCES_COLLECTION_ID,
          [
            Query.equal('userId', leaveRequest.userId),
            Query.equal('workspaceId', leaveRequest.workspaceId || ''),
            Query.equal('year', currentYear)
          ]
        );

        if (balanceQuery.documents.length > 0) {
          const balanceDoc = balanceQuery.documents[0] as any;
          
          // Get which DB field to restore based on leave type
          const balanceField = getBalanceFieldForLeaveType(leaveRequest.leaveType);
          
          // Calculate restoration amount (match deduction logic - INTEGER)
          // HALF_DAY leave type: restore 1 unit
          // Other types: restore full days
          const restorationAmount = leaveRequest.leaveType === 'HALF_DAY' 
            ? 1 
            : Math.ceil(leaveRequest.days);
          
          // Restore balance
          const currentFieldValue = balanceDoc[balanceField] || 0;
          const restoredValue = currentFieldValue + restorationAmount;

          // Update ONLY the relevant balance field
          const updateData: any = {};
          updateData[balanceField] = restoredValue;

          await databases.updateDocument(
            DATABASE_ID,
            LEAVE_BALANCES_COLLECTION_ID,
            balanceDoc.$id,
            updateData
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
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to cancel leave request',
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
 * Returns the 4 DB fields: paidLeave, unpaidLeave, halfDay, compOff
 */
export function useLeaveBalance(userId?: string, workspaceId?: string) {
  return useQuery({
    queryKey: ['leaveBalance', userId, workspaceId],
    queryFn: async () => {
      if (!userId || !workspaceId) return null;

      const currentYear = new Date().getFullYear();
      const response = await databases.listDocuments(
        DATABASE_ID,
        LEAVE_BALANCES_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.equal('workspaceId', workspaceId),
          Query.equal('year', currentYear)
        ]
      );

      if (response.documents.length === 0) {
        // Initialize leave balance
        const initialBalance = initializeLeaveBalance();
        const newBalance = await databases.createDocument(
          DATABASE_ID,
          LEAVE_BALANCES_COLLECTION_ID,
          ID.unique(),
          {
            workspaceId,
            userId,
            year: currentYear,
            ...initialBalance, // paidLeave, unpaidLeave, halfDay, compOff
          }
        );

        return newBalance as unknown as LeaveBalance;
      }

      return response.documents[0] as unknown as LeaveBalance;
    },
    enabled: !!userId && !!workspaceId,
  });
}
