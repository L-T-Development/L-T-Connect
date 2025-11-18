import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query, ID } from 'appwrite';
import type { Project, ProjectMethodology, ProjectStatus } from '@/types';
import { toast } from '@/hooks/use-toast';
import { generateProjectCode } from '@/lib/utils';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const PROJECTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECTS_COLLECTION_ID!;

export function useProjects(workspaceId?: string) {
  return useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        PROJECTS_COLLECTION_ID,
        [Query.equal('workspaceId', workspaceId), Query.orderDesc('$createdAt')]
      );
      
      // Parse JSON fields
      const projects = response.documents.map(doc => ({
        ...doc,
        settings: typeof doc.settings === 'string' ? JSON.parse(doc.settings) : doc.settings,
        memberIds: Array.isArray(doc.memberIds) ? doc.memberIds : [doc.memberIds],
        archived: doc.archived ?? false, // Fallback to false if attribute doesn't exist
      })) as unknown as Project[];
      
      return projects;
    },
    enabled: !!workspaceId,
  });
}

export function useProject(projectId?: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      const response = await databases.getDocument(
        DATABASE_ID,
        PROJECTS_COLLECTION_ID,
        projectId
      );
      
      // Parse JSON fields
      const project = {
        ...response,
        settings: typeof response.settings === 'string' ? JSON.parse(response.settings) : response.settings,
        memberIds: Array.isArray(response.memberIds) ? response.memberIds : [response.memberIds],
        archived: response.archived ?? false, // Fallback to false if attribute doesn't exist
      } as unknown as Project;
      
      return project;
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      name: string;
      description?: string;
      clientName?: string; // ✅ NEW: Client name field
      methodology: ProjectMethodology;
      startDate?: string;
      endDate?: string;
      ownerId: string;
      createdBy?: string;
      createdByName?: string;
    }) => {
      const projectCode = generateProjectCode(data.name);
      
      const projectData = {
        workspaceId: data.workspaceId,
        name: data.name,
        shortCode: projectCode, // Match database field name
        description: data.description || '',
        clientName: data.clientName || '', // ✅ NEW: Include client name
        methodology: data.methodology,
        status: 'PLANNING' as ProjectStatus,
        archived: false,
        startDate: data.startDate || new Date().toISOString(),
        endDate: data.endDate,
        ownerId: data.ownerId,
        createdBy: data.createdBy || data.ownerId,
        createdByName: data.createdByName || '',
        memberIds: [data.ownerId], // Native array, not JSON string
        settings: JSON.stringify({ // Stringify settings object
          enableTimeTracking: true,
          enableCustomFields: false,
          autoAssignToCreator: true,
          requireEstimates: false,
        }),
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        PROJECTS_COLLECTION_ID,
        ID.unique(),
        projectData
      );

      // Parse response
      const project = {
        ...response,
        settings: JSON.parse(response.settings as any),
        memberIds: Array.isArray(response.memberIds) ? response.memberIds : [response.memberIds],
      };

      return project as unknown as Project;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', variables.workspaceId] });
      toast({
        title: 'Success',
        description: 'Project created successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create project',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      workspaceId: string;
      name?: string;
      description?: string;
      status?: ProjectStatus;
      startDate?: string;
      endDate?: string;
      settings?: Project['settings'];
    }) => {
      const { projectId, workspaceId, ...updates } = data;
      
      // Convert settings to JSON string if provided
      const updateData: any = { ...updates };
      if (updates.settings) {
        updateData.settings = JSON.stringify(updates.settings);
      }
      
      const response = await databases.updateDocument(
        DATABASE_ID,
        PROJECTS_COLLECTION_ID,
        projectId,
        updateData
      );

      // Parse response
      const project = {
        ...response,
        settings: typeof response.settings === 'string' 
          ? JSON.parse(response.settings) 
          : response.settings,
        memberIds: Array.isArray(response.memberIds)
          ? response.memberIds
          : [response.memberIds],
      };

      return project as unknown as Project;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.workspaceId] });
      toast({
        title: 'Success',
        description: 'Project updated successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update project',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { projectId: string; workspaceId: string }) => {
      await databases.deleteDocument(
        DATABASE_ID,
        PROJECTS_COLLECTION_ID,
        data.projectId
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects', data.workspaceId] });
      toast({
        title: 'Success',
        description: 'Project deleted successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete project',
        variant: 'destructive',
      });
    },
  });
}

export function useAddProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      workspaceId: string;
      userId: string;
      currentMembers: string[];
    }) => {
      const updatedMembers = [...data.currentMembers, data.userId];
      
      const response = await databases.updateDocument(
        DATABASE_ID,
        PROJECTS_COLLECTION_ID,
        data.projectId,
        { memberIds: updatedMembers } // Fixed: members → memberIds
      );

      return response as unknown as Project;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.workspaceId] });
      toast({
        title: 'Success',
        description: 'Member added to project!',
      });
    },
  });
}

export function useChangeProjectMethodology() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      workspaceId: string;
      methodology: ProjectMethodology;
    }) => {
      const response = await databases.updateDocument(
        DATABASE_ID,
        PROJECTS_COLLECTION_ID,
        data.projectId,
        { methodology: data.methodology }
      );

      const project = {
        ...response,
        settings: typeof response.settings === 'string' 
          ? JSON.parse(response.settings) 
          : response.settings,
        memberIds: Array.isArray(response.memberIds)
          ? response.memberIds
          : [response.memberIds],
      };

      return project as unknown as Project;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', variables.workspaceId] });
      toast({
        title: 'Methodology Changed',
        description: `Project methodology updated to ${variables.methodology}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to change methodology',
        variant: 'destructive',
      });
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      try {
        const response = await databases.updateDocument(
          DATABASE_ID,
          PROJECTS_COLLECTION_ID,
          projectId,
          { archived: true }
        );

        // Parse settings if it's a string
        const project = {
          ...response,
          settings: typeof response.settings === 'string' && response.settings
            ? JSON.parse(response.settings)
            : response.settings,
          memberIds: typeof response.memberIds === 'string' && response.memberIds
            ? JSON.parse(response.memberIds)
            : response.memberIds,
        } as unknown as Project;

        return project;
      } catch (error: any) {
        // Check if error is due to missing attribute
        if (error.message?.includes('Unknown attribute') && error.message?.includes('archived')) {
          throw new Error('Database schema missing "archived" attribute. Please add it to Projects collection in Appwrite Console. See APPWRITE_SCHEMA_MIGRATION.md for instructions.');
        }
        throw error;
      }
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', project.$id] });
      toast({
        title: 'Project archived',
        description: `${project.name} has been archived successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error archiving project',
        description: error.message || 'Failed to archive project',
        variant: 'destructive',
      });
    },
  });
}

export function useRestoreProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      try {
        const response = await databases.updateDocument(
          DATABASE_ID,
          PROJECTS_COLLECTION_ID,
          projectId,
          { archived: false }
        );

        // Parse settings if it's a string
        const project = {
          ...response,
          settings: typeof response.settings === 'string' && response.settings
            ? JSON.parse(response.settings)
            : response.settings,
          memberIds: typeof response.memberIds === 'string' && response.memberIds
            ? JSON.parse(response.memberIds)
            : response.memberIds,
        } as unknown as Project;

        return project;
      } catch (error: any) {
        // Check if error is due to missing attribute
        if (error.message?.includes('Unknown attribute') && error.message?.includes('archived')) {
          throw new Error('Database schema missing "archived" attribute. Please add it to Projects collection in Appwrite Console. See APPWRITE_SCHEMA_MIGRATION.md for instructions.');
        }
        throw error;
      }
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', project.$id] });
      toast({
        title: 'Project restored',
        description: `${project.name} has been restored successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error restoring project',
        description: error.message || 'Failed to restore project',
        variant: 'destructive',
      });
    },
  });
}

export function useCloneProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      sourceProjectId: string;
      newName: string;
      includeSettings: boolean;
      includeTasks: boolean;
      includeMembers: boolean;
      includeSprints: boolean;
      userId: string;
    }) => {
      try {
        // Get source project
        const sourceProject = await databases.getDocument(
          DATABASE_ID,
          PROJECTS_COLLECTION_ID,
          data.sourceProjectId
        );

        // Parse source project
        const parsedSource = {
          ...sourceProject,
          settings: typeof sourceProject.settings === 'string' 
            ? JSON.parse(sourceProject.settings) 
            : sourceProject.settings,
          memberIds: typeof sourceProject.memberIds === 'string'
            ? JSON.parse(sourceProject.memberIds)
            : sourceProject.memberIds,
        } as unknown as Project;

        // Generate new project code
        const projectCode = generateProjectCode(data.newName);

        // Prepare new project data
        const newProjectData = {
          workspaceId: parsedSource.workspaceId,
          name: data.newName,
          shortCode: projectCode,
          description: parsedSource.description || `Cloned from ${parsedSource.name}`,
          methodology: parsedSource.methodology,
          status: 'PLANNING' as ProjectStatus,
          archived: false,
          startDate: new Date().toISOString(),
          endDate: undefined,
          ownerId: data.userId,
          memberIds: data.includeMembers ? parsedSource.memberIds : [data.userId],
          settings: JSON.stringify(
            data.includeSettings
              ? parsedSource.settings
              : {
                  enableTimeTracking: true,
                  enableCustomFields: false,
                  autoAssignToCreator: true,
                  requireEstimates: false,
                }
          ),
        };

        // Create new project
        const newProject = await databases.createDocument(
          DATABASE_ID,
          PROJECTS_COLLECTION_ID,
          ID.unique(),
          newProjectData
        );

        const parsedNewProject = {
          ...newProject,
          settings: JSON.parse(newProject.settings as any),
          memberIds: Array.isArray(newProject.memberIds) ? newProject.memberIds : [newProject.memberIds],
        } as unknown as Project;

        // Clone tasks if requested
        if (data.includeTasks) {
          const TASKS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!;
          
          // Get all tasks from source project
          const tasksResponse = await databases.listDocuments(
            DATABASE_ID,
            TASKS_COLLECTION_ID,
            [Query.equal('projectId', data.sourceProjectId), Query.limit(1000)]
          );

          // Clone each task
          for (const task of tasksResponse.documents) {
            const taskData = {
              workspaceId: parsedNewProject.workspaceId,
              projectId: parsedNewProject.$id,
              hierarchyId: task.hierarchyId.replace(parsedSource.shortCode, projectCode),
              title: task.title,
              description: task.description || '',
              status: 'TODO' as const,
              priority: task.priority,
              assigneeIds: typeof task.assigneeIds === 'string' ? task.assigneeIds : JSON.stringify(task.assigneeIds || []),
              createdBy: data.userId,
              labels: typeof task.labels === 'string' ? task.labels : JSON.stringify(task.labels || []),
              attachments: typeof task.attachments === 'string' ? task.attachments : JSON.stringify([]),
              customFields: typeof task.customFields === 'string' ? task.customFields : JSON.stringify({}),
              position: task.position || 0,
              blockedBy: '[]', // Initialize empty dependency arrays
              blocks: '[]',
            };

            await databases.createDocument(
              DATABASE_ID,
              TASKS_COLLECTION_ID,
              ID.unique(),
              taskData
            );
          }
        }

        // Clone sprints if requested
        if (data.includeSprints) {
          const SPRINTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_SPRINTS_COLLECTION_ID!;
          
          // Get all sprints from source project
          const sprintsResponse = await databases.listDocuments(
            DATABASE_ID,
            SPRINTS_COLLECTION_ID,
            [Query.equal('projectId', data.sourceProjectId), Query.limit(100)]
          );

          // Clone each sprint
          for (const sprint of sprintsResponse.documents) {
            const sprintData = {
              projectId: parsedNewProject.$id,
              name: sprint.name,
              goal: sprint.goal || '',
              status: 'PLANNED' as const,
                // capacity removed - sprint workload tracked by task counts
            };

            await databases.createDocument(
              DATABASE_ID,
              SPRINTS_COLLECTION_ID,
              ID.unique(),
              sprintData
            );
          }
        }

        return parsedNewProject;
      } catch (error: any) {
        // Check if error is due to missing attribute
        if (error.message?.includes('Unknown attribute')) {
          if (error.message?.includes('archived')) {
            throw new Error('Database schema missing "archived" attribute. Please add it to Projects collection. See APPWRITE_SCHEMA_MIGRATION.md');
          }
          if (error.message?.includes('blockedBy') || error.message?.includes('blocks')) {
            throw new Error('Database schema missing dependency attributes. Please add "blockedBy" and "blocks" to Tasks collection. See APPWRITE_SCHEMA_MIGRATION.md');
          }
        }
        throw error;
      }
    },
    onSuccess: (newProject, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'Project cloned successfully',
        description: `${newProject.name} has been created with ${variables.includeTasks ? 'tasks' : 'no tasks'}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to clone project',
        variant: 'destructive',
      });
    },
  });
}

