import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query, ID } from 'appwrite';
import type { ClientRequirement, RequirementPriority, RequirementStatus } from '@/types';
import { toast } from '@/hooks/use-toast';
import { createBulkNotifications } from '@/hooks/use-notification';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const CLIENT_REQUIREMENTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_CLIENT_REQUIREMENTS_COLLECTION_ID!;
const PROJECTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECTS_COLLECTION_ID!;
const WORKSPACE_MEMBERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_WORKSPACE_MEMBERS_COLLECTION_ID!;
const EPICS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EPICS_COLLECTION_ID!;
const REQUIREMENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_REQUIREMENTS_COLLECTION_ID!;
const TASKS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!;

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
      const requirements = response.documents.map((doc) => ({
        ...doc,
        attachments:
          typeof doc.attachments === 'string' ? JSON.parse(doc.attachments) : doc.attachments || [],
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
        attachments:
          typeof response.attachments === 'string'
            ? JSON.parse(response.attachments)
            : response.attachments || [],
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
    onSuccess: async (createdReq, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-requirements', variables.projectId] });

      // ✅ Send REQUIREMENT_CREATED notification to workspace members
      try {
        // Get project name for notification
        let projectName = 'Project';
        try {
          const project = await databases.getDocument(
            DATABASE_ID,
            PROJECTS_COLLECTION_ID,
            variables.projectId
          );
          projectName = project.name || 'Project';
        } catch (error) {
          console.error('Failed to get project name for notification:', error);
        }

        // Get workspace members to notify
        const membersResponse = await databases.listDocuments(
          DATABASE_ID,
          WORKSPACE_MEMBERS_COLLECTION_ID,
          [Query.equal('workspaceId', variables.workspaceId)]
        );

        const memberIds = membersResponse.documents
          .map((m: any) => m.userId)
          .filter((id: string) => id !== variables.createdBy); // Don't notify creator

        if (memberIds.length > 0) {
          await createBulkNotifications({
            workspaceId: variables.workspaceId,
            userIds: memberIds,
            type: 'REQUIREMENT_CREATED',
            data: {
              requirementId: createdReq.$id,
              requirementTitle: createdReq.title,
              projectId: variables.projectId,
              projectName,
              creatorName: variables.createdByName || 'Team Member',
              clientName: variables.clientName,
              entityType: 'REQUIREMENT',
            },
          });
        }
      } catch (error) {
        console.error('Failed to send requirement creation notifications:', error);
      }

      toast({
        title: 'Success',
        description: 'Client requirement created successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description:
          (error instanceof Error ? error.message : String(error)) ||
          'Failed to create client requirement',
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
        description:
          (error instanceof Error ? error.message : String(error)) ||
          'Failed to update client requirement',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteClientRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { requirementId: string; projectId: string }) => {
      // ✅ CASCADE DELETE: Delete all Epics linked to this client requirement
      const linkedEpics = await databases.listDocuments(DATABASE_ID, EPICS_COLLECTION_ID, [
        Query.equal('requirementId', data.requirementId),
        Query.limit(100),
      ]);

      // For each Epic, delete all linked FRs and their tasks
      for (const epic of linkedEpics.documents) {
        // Get all FRs linked to this epic
        const linkedFRs = await databases.listDocuments(DATABASE_ID, REQUIREMENTS_COLLECTION_ID, [
          Query.equal('epicId', epic.$id),
          Query.limit(100),
        ]);

        // For each FR, delete all linked tasks first
        for (const fr of linkedFRs.documents) {
          const linkedTasks = await databases.listDocuments(DATABASE_ID, TASKS_COLLECTION_ID, [
            Query.equal('functionalRequirementId', fr.$id),
            Query.limit(100),
          ]);

          // Delete all tasks linked to this FR
          await Promise.all(
            linkedTasks.documents.map((task) =>
              databases.deleteDocument(DATABASE_ID, TASKS_COLLECTION_ID, task.$id)
            )
          );

          // Delete the FR
          await databases.deleteDocument(DATABASE_ID, REQUIREMENTS_COLLECTION_ID, fr.$id);
        }

        // Delete any tasks directly linked to this epic
        const epicTasks = await databases.listDocuments(DATABASE_ID, TASKS_COLLECTION_ID, [
          Query.equal('epicId', epic.$id),
          Query.limit(100),
        ]);

        await Promise.all(
          epicTasks.documents.map((task) =>
            databases.deleteDocument(DATABASE_ID, TASKS_COLLECTION_ID, task.$id)
          )
        );

        // Delete the epic
        await databases.deleteDocument(DATABASE_ID, EPICS_COLLECTION_ID, epic.$id);
      }

      // ✅ Also delete FRs directly linked to this client requirement (without Epic)
      const directFRs = await databases.listDocuments(DATABASE_ID, REQUIREMENTS_COLLECTION_ID, [
        Query.equal('clientRequirementId', data.requirementId),
        Query.limit(100),
      ]);

      for (const fr of directFRs.documents) {
        const linkedTasks = await databases.listDocuments(DATABASE_ID, TASKS_COLLECTION_ID, [
          Query.equal('functionalRequirementId', fr.$id),
          Query.limit(100),
        ]);

        // Delete all tasks linked to this FR
        await Promise.all(
          linkedTasks.documents.map((task) =>
            databases.deleteDocument(DATABASE_ID, TASKS_COLLECTION_ID, task.$id)
          )
        );

        // Delete the FR
        await databases.deleteDocument(DATABASE_ID, REQUIREMENTS_COLLECTION_ID, fr.$id);
      }

      // Finally, delete the client requirement
      await databases.deleteDocument(
        DATABASE_ID,
        CLIENT_REQUIREMENTS_COLLECTION_ID,
        data.requirementId
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-requirements', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['epics', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['functional-requirements', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', data.projectId] });
      toast({
        title: 'Success',
        description: 'Client requirement and all linked items deleted successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description:
          (error instanceof Error ? error.message : String(error)) ||
          'Failed to delete client requirement',
        variant: 'destructive',
      });
    },
  });
}
