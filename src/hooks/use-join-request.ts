'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query } from 'appwrite';
import type { JoinRequest, JoinRequestStatus } from '@/types';

const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_JOIN_REQUESTS_ID!;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

// Get all join requests for a user
export function useJoinRequests(userId?: string) {
  return useQuery({
    queryKey: ['join-requests', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [Query.equal('userId', userId), Query.orderDesc('$createdAt')]
      );
      
      return response.documents as unknown as JoinRequest[];
    },
    enabled: !!userId,
  });
}

// Get pending join requests for a workspace (for admins/managers)
export function usePendingJoinRequests(workspaceId?: string) {
  return useQuery({
    queryKey: ['join-requests', 'pending', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
          Query.equal('workspaceId', workspaceId),
          Query.equal('status', 'PENDING'),
          Query.orderDesc('$createdAt'),
        ]
      );
      
      return response.documents as unknown as JoinRequest[];
    },
    enabled: !!workspaceId,
  });
}

// Get all join requests for a workspace (for admins/managers)
export function useWorkspaceJoinRequests(workspaceId?: string, status?: JoinRequestStatus) {
  return useQuery({
    queryKey: ['join-requests', 'workspace', workspaceId, status],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const queries = [
        Query.equal('workspaceId', workspaceId),
        Query.orderDesc('$createdAt'),
      ];
      
      if (status) {
        queries.push(Query.equal('status', status));
      }
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        queries
      );
      
      return response.documents as unknown as JoinRequest[];
    },
    enabled: !!workspaceId,
  });
}

// Create a new join request
export function useCreateJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      workspaceName: string;
      userId: string;
      userName: string;
      userEmail: string;
      userAvatar?: string;
      inviteCode: string;
      message?: string;
    }) => {
      const requestData = {
        workspaceId: data.workspaceId,
        workspaceName: data.workspaceName,
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        userAvatar: data.userAvatar || '',
        inviteCode: data.inviteCode,
        status: 'PENDING' as JoinRequestStatus,
        message: data.message || '',
        requestedAt: new Date().toISOString(),
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        'unique()',
        requestData
      );

      return response as unknown as JoinRequest;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['join-requests', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['join-requests', 'pending', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['join-requests', 'workspace', variables.workspaceId] });
    },
  });
}

// Approve a join request
export function useApproveJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      requestId: string;
      workspaceId: string;
      userId: string;
      processorId: string;
      processorName: string;
    }) => {
      const updateData = {
        status: 'APPROVED' as JoinRequestStatus,
        processedAt: new Date().toISOString(),
        processedBy: data.processorId,
        processorName: data.processorName,
      };

      const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        data.requestId,
        updateData
      );

      return response as unknown as JoinRequest;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-members', variables.workspaceId] });
    },
  });
}

// Reject a join request
export function useRejectJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      requestId: string;
      workspaceId: string;
      userId: string;
      processorId: string;
      processorName: string;
      rejectionReason: string;
    }) => {
      const updateData = {
        status: 'REJECTED' as JoinRequestStatus,
        processedAt: new Date().toISOString(),
        processedBy: data.processorId,
        processorName: data.processorName,
        rejectionReason: data.rejectionReason,
      };

      const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        data.requestId,
        updateData
      );

      return response as unknown as JoinRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
    },
  });
}

// Delete a join request (for cleanup)
export function useDeleteJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { requestId: string; workspaceId: string; userId: string }) => {
      await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, data.requestId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['join-requests', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['join-requests', 'pending', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['join-requests', 'workspace', variables.workspaceId] });
    },
  });
}
