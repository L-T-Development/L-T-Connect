import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query, ID } from 'appwrite';
import type { Epic } from '@/types';
import { toast } from '@/hooks/use-toast';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const EPICS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EPICS_COLLECTION_ID!;

export function useEpics(projectId?: string) {
  return useQuery({
    queryKey: ['epics', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        EPICS_COLLECTION_ID,
        [Query.equal('projectId', projectId), Query.orderDesc('$createdAt')]
      );
      
      return response.documents as unknown as Epic[];
    },
    enabled: !!projectId,
  });
}

export function useEpic(epicId?: string) {
  return useQuery({
    queryKey: ['epic', epicId],
    queryFn: async () => {
      if (!epicId) return null;
      
      const response = await databases.getDocument(
        DATABASE_ID,
        EPICS_COLLECTION_ID,
        epicId
      );
      
      return response as unknown as Epic;
    },
    enabled: !!epicId,
  });
}

// ✅ NEW: Get epics by requirement (proper hierarchy)
export function useEpicsByRequirement(requirementId?: string) {
  return useQuery({
    queryKey: ['epics', 'requirement', requirementId],
    queryFn: async () => {
      if (!requirementId) return [];
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        EPICS_COLLECTION_ID,
        [Query.equal('requirementId', requirementId), Query.orderDesc('$createdAt')]
      );
      
      return response.documents as unknown as Epic[];
    },
    enabled: !!requirementId,
  });
}

export function useCreateEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      projectId: string;
      projectCode: string;
      requirementId?: string; // ✅ FIXED: Use requirementId (parent requirement)
      name: string;
      description?: string;
      color?: string;
      startDate?: string;
      endDate?: string;
      assignedTeam?: string; // ✅ NEW: Team assignment
      createdBy: string;
      createdByName?: string;
    }) => {
      // Get existing epics to generate hierarchyId
      const existingEpics = await databases.listDocuments(
        DATABASE_ID,
        EPICS_COLLECTION_ID,
        [Query.equal('projectId', data.projectId)]
      );

      // Generate hierarchical ID (e.g., ABC-EPIC-01, ABC-EPIC-02)
      const epicNumber = (existingEpics.documents.length + 1).toString().padStart(2, '0');
      const hierarchyId = `${data.projectCode}-EPIC-${epicNumber}`;

      const epicData = {
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        hierarchyId,
        name: data.name,
        description: data.description || '',
        color: data.color,
        startDate: data.startDate,
        endDate: data.endDate,
        status: 'TODO',
        progress: 0,
        requirementId: data.requirementId || '', // ✅ FIXED: Link to parent requirement
        assignedTeam: data.assignedTeam || '', // ✅ NEW: Team assignment
        createdBy: data.createdBy,
        createdByName: data.createdByName || '',
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        EPICS_COLLECTION_ID,
        ID.unique(),
        epicData
      );

      return response as unknown as Epic;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['epics', variables.projectId] });
      if (variables.requirementId) {
        queryClient.invalidateQueries({ queryKey: ['epics', 'requirement', variables.requirementId] });
      }
      toast({
        title: 'Success',
        description: 'Epic created successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create epic',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      epicId: string;
      projectId: string;
      updates: {
        name?: string;
        description?: string;
        color?: string;
        startDate?: string;
        endDate?: string;
        status?: Epic['status'];
        progress?: number;
        requirementId?: string; // ✅ FIXED: Use requirementId
        assignedTeam?: string; // ✅ NEW: Team assignment
      };
    }) => {
      const { epicId, ...updates } = data;
      
      const response = await databases.updateDocument(
        DATABASE_ID,
        EPICS_COLLECTION_ID,
        epicId,
        updates.updates
      );

      return response as unknown as Epic;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['epic', variables.epicId] });
      queryClient.invalidateQueries({ queryKey: ['epics', variables.projectId] });
      if (variables.updates.requirementId) {
        queryClient.invalidateQueries({ queryKey: ['epics', 'requirement', variables.updates.requirementId] });
      }
      toast({
        title: 'Success',
        description: 'Epic updated successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update epic',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { epicId: string; projectId: string }) => {
      await databases.deleteDocument(
        DATABASE_ID,
        EPICS_COLLECTION_ID,
        data.epicId
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['epics', data.projectId] });
      toast({
        title: 'Success',
        description: 'Epic deleted successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete epic',
        variant: 'destructive',
      });
    },
  });
}
