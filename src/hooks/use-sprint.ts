import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query, ID } from 'appwrite';
import type { Sprint } from '@/types';
import { toast } from '@/hooks/use-toast';
import { createBulkNotifications } from '@/hooks/use-notification';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const SPRINTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_SPRINTS_COLLECTION_ID!;

export function useSprints(projectId?: string) {
  return useQuery({
    queryKey: ['sprints', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        SPRINTS_COLLECTION_ID,
        [
          Query.equal('projectId', projectId),
          Query.orderDesc('$createdAt')
        ]
      );
      
      return response.documents as unknown as Sprint[];
    },
    enabled: !!projectId,
  });
}

// Hook to get all sprints in a workspace (for calendar)
export function useWorkspaceSprints(workspaceId?: string) {
  return useQuery({
    queryKey: ['workspace-sprints', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        SPRINTS_COLLECTION_ID,
        [
          Query.equal('workspaceId', workspaceId),
          Query.orderDesc('$createdAt'),
          Query.limit(1000)
        ]
      );
      
      return response.documents as unknown as Sprint[];
    },
    enabled: !!workspaceId,
  });
}

export function useActiveSprint(projectId?: string) {
  return useQuery({
    queryKey: ['sprint', 'active', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        SPRINTS_COLLECTION_ID,
        [
          Query.equal('projectId', projectId),
          Query.equal('status', 'ACTIVE'),
          Query.limit(1)
        ]
      );
      
      return response.documents.length > 0 
        ? response.documents[0] as unknown as Sprint 
        : null;
    },
    enabled: !!projectId,
  });
}

export function useSprint(sprintId?: string) {
  return useQuery({
    queryKey: ['sprint', sprintId],
    queryFn: async () => {
      if (!sprintId) return null;
      
      const response = await databases.getDocument(
        DATABASE_ID,
        SPRINTS_COLLECTION_ID,
        sprintId
      );
      
      return response as unknown as Sprint;
    },
    enabled: !!sprintId,
  });
}

export function useCreateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      projectId: string;
      name: string;
      goal?: string;
      startDate: string;
      endDate: string;
      createdBy: string;
      createdByName?: string;
    }) => {
      const response = await databases.createDocument(
        DATABASE_ID,
        SPRINTS_COLLECTION_ID,
        ID.unique(),
        {
          workspaceId: data.workspaceId,
          projectId: data.projectId,
          name: data.name,
          goal: data.goal || '',
          startDate: data.startDate,
          endDate: data.endDate,
          // capacity removed - sprint workload now measured by task counts
          status: 'PLANNING',
          retrospectiveNotes: '',
          createdBy: data.createdBy,
          createdByName: data.createdByName || '',
        }
      );
      return response as unknown as Sprint;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', variables.projectId] });
      toast({
        title: 'Sprint created',
        description: 'The sprint has been created successfully.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to create sprint',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sprintId,
      updates,
    }: {
      sprintId: string;
      updates: Partial<Omit<Sprint, '$id' | '$createdAt' | '$updatedAt' | 'workspaceId' | 'projectId' | 'createdBy'>>;
    }) => {
      const response = await databases.updateDocument(
        DATABASE_ID,
        SPRINTS_COLLECTION_ID,
        sprintId,
        updates
      );
      return response as unknown as Sprint;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sprint', variables.sprintId] });
      queryClient.invalidateQueries({ queryKey: ['sprints', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['sprint', 'active', data.projectId] });
      toast({
        title: 'Sprint updated',
        description: 'The sprint has been updated successfully.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to update sprint',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sprintId,
    }: {
      sprintId: string;
      projectId: string;
    }) => {
      await databases.deleteDocument(
        DATABASE_ID,
        SPRINTS_COLLECTION_ID,
        sprintId
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['sprint', variables.sprintId] });
      queryClient.invalidateQueries({ queryKey: ['sprint', 'active', variables.projectId] });
      toast({
        title: 'Sprint deleted',
        description: 'The sprint has been deleted successfully.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to delete sprint',
        variant: 'destructive',
      });
    },
  });
}

export function useStartSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sprintId,
    }: {
      sprintId: string;
      projectId: string;
      teamMemberIds?: string[];
      taskCount?: number;
    }) => {
      const response = await databases.updateDocument(
        DATABASE_ID,
        SPRINTS_COLLECTION_ID,
        sprintId,
        { status: 'ACTIVE' }
      );
      return response as unknown as Sprint;
    },
    onSuccess: async (sprint: Sprint, variables: {
      sprintId: string;
      projectId: string;
      teamMemberIds?: string[];
      taskCount?: number;
    }) => {
      queryClient.invalidateQueries({ queryKey: ['sprint', variables.sprintId] });
      queryClient.invalidateQueries({ queryKey: ['sprints', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['sprint', 'active', variables.projectId] });
      
      // Send SPRINT_STARTED notifications to team members
      if (variables.teamMemberIds && variables.teamMemberIds.length > 0) {
        await createBulkNotifications({
          workspaceId: sprint.workspaceId,
          userIds: variables.teamMemberIds,
          type: 'SPRINT_STARTED',
          data: {
            sprintName: sprint.name,
            sprintGoal: sprint.goal,
            startDate: sprint.startDate,
            endDate: sprint.endDate,
            taskCount: variables.taskCount || 0,
            sprintId: sprint.$id,
          },
        });
      }
      
      toast({
        title: 'Sprint started',
        description: 'The sprint is now active.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to start sprint',
        variant: 'destructive',
      });
    },
  });
}

export function useCompleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sprintId,
      retrospectiveNotes,
    }: {
      sprintId: string;
      projectId: string;
      retrospectiveNotes?: string;
      teamMemberIds?: string[];
      completedTasks?: number;
      totalTasks?: number;
    }) => {
      const response = await databases.updateDocument(
        DATABASE_ID,
        SPRINTS_COLLECTION_ID,
        sprintId,
        { 
          status: 'COMPLETED',
          retrospectiveNotes: retrospectiveNotes || '',
        }
      );
      return response as unknown as Sprint;
    },
    onSuccess: async (sprint: Sprint, variables: {
      sprintId: string;
      projectId: string;
      retrospectiveNotes?: string;
      teamMemberIds?: string[];
      completedTasks?: number;
      totalTasks?: number;
    }) => {
      queryClient.invalidateQueries({ queryKey: ['sprint', variables.sprintId] });
      queryClient.invalidateQueries({ queryKey: ['sprints', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['sprint', 'active', variables.projectId] });
      
      // Send SPRINT_COMPLETED notifications to team members
      if (variables.teamMemberIds && variables.teamMemberIds.length > 0) {
        await createBulkNotifications({
          workspaceId: sprint.workspaceId,
          userIds: variables.teamMemberIds,
          type: 'SPRINT_COMPLETED',
          data: {
            sprintName: sprint.name,
            completedTasks: variables.completedTasks || 0,
            totalTasks: variables.totalTasks || 0,
            completionRate: variables.totalTasks 
              ? Math.round((variables.completedTasks || 0) / variables.totalTasks * 100)
              : 0,
            sprintId: sprint.$id,
          },
        });
      }
      
      toast({
        title: 'Sprint completed',
        description: 'The sprint has been marked as completed.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to complete sprint',
        variant: 'destructive',
      });
    },
  });
}
