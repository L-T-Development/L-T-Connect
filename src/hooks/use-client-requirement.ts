import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query, ID } from 'appwrite';
import type { ClientRequirement, RequirementPriority, RequirementStatus } from '@/types';
import { toast } from '@/hooks/use-toast';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const CLIENT_REQUIREMENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CLIENT_REQUIREMENTS_COLLECTION_ID!;

export function useClientRequirements(projectId?: string) {
  return useQuery({
    queryKey: ['client-requirements', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        CLIENT_REQUIREMENTS_COLLECTION_ID,
        [Query.equal('projectId', projectId), Query.orderDesc('$createdAt')]
      );
      
      // Parse attachments from JSON string
      const requirements = response.documents.map(doc => ({
        ...doc,
        attachments: typeof doc.attachments === 'string' ? JSON.parse(doc.attachments) : doc.attachments || [],
      })) as unknown as ClientRequirement[];
      
      return requirements;
    },
    enabled: !!projectId,
  });
}

export function useClientRequirement(requirementId?: string) {
  return useQuery({
    queryKey: ['client-requirement', requirementId],
    queryFn: async () => {
      if (!requirementId) return null;
      
      const response = await databases.getDocument(
        DATABASE_ID,
        CLIENT_REQUIREMENTS_COLLECTION_ID,
        requirementId
      );
      
      const requirement = {
        ...response,
        attachments: typeof response.attachments === 'string' ? JSON.parse(response.attachments) : response.attachments || [],
      } as unknown as ClientRequirement;
      
      return requirement;
    },
    enabled: !!requirementId,
  });
}

export function useCreateClientRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      projectId: string;
      title: string;
      description: string;
      clientName: string;
      priority: RequirementPriority;
      createdBy: string;
      createdByName?: string;
    }) => {
      const requirementData = {
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        clientName: data.clientName,
        priority: data.priority,
        status: 'DRAFT' as RequirementStatus,
        attachments: JSON.stringify([]),
        createdBy: data.createdBy,
        createdByName: data.createdByName || '',
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        CLIENT_REQUIREMENTS_COLLECTION_ID,
        ID.unique(),
        requirementData
      );

      return response as unknown as ClientRequirement;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-requirements', variables.projectId] });
      toast({
        title: 'Success',
        description: 'Client requirement created successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to create client requirement',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateClientRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      requirementId: string;
      projectId: string;
      updates: {
        title?: string;
        description?: string;
        clientName?: string;
        priority?: RequirementPriority;
        status?: RequirementStatus;
      };
    }) => {
      const { requirementId, ...updates } = data;
      
      const response = await databases.updateDocument(
        DATABASE_ID,
        CLIENT_REQUIREMENTS_COLLECTION_ID,
        requirementId,
        updates.updates
      );

      return response as unknown as ClientRequirement;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-requirement', variables.requirementId] });
      queryClient.invalidateQueries({ queryKey: ['client-requirements', variables.projectId] });
      toast({
        title: 'Success',
        description: 'Client requirement updated successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to update client requirement',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteClientRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { requirementId: string; projectId: string }) => {
      await databases.deleteDocument(
        DATABASE_ID,
        CLIENT_REQUIREMENTS_COLLECTION_ID,
        data.requirementId
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-requirements', data.projectId] });
      toast({
        title: 'Success',
        description: 'Client requirement deleted successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to delete client requirement',
        variant: 'destructive',
      });
    },
  });
}
