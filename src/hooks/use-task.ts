import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query, ID } from 'appwrite';
import type { Task, TaskStatus, TaskPriority, FunctionalRequirement } from '@/types';
import { toast } from '@/hooks/use-toast';
import { createBulkNotifications } from '@/hooks/use-notification';
import { generateTaskId, generateTaskIdWithoutFR } from '@/lib/hierarchy-id-generator';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const TASKS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!;
const FUNCTIONAL_REQUIREMENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FUNCTIONAL_REQUIREMENTS_COLLECTION_ID!;
const SPRINTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_SPRINTS_COLLECTION_ID!;
const PROJECTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECTS_COLLECTION_ID!;

export function useTasks(projectId?: string) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await databases.listDocuments(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        [Query.equal('projectId', projectId), Query.orderAsc('position')]
      );

      // Parse JSON fields
      const tasks = response.documents.map(doc => ({
        ...doc,
        labels: typeof doc.labels === 'string' && doc.labels ? JSON.parse(doc.labels) : [],
        attachments: typeof doc.attachments === 'string' && doc.attachments ? JSON.parse(doc.attachments) : [],
        customFields: typeof doc.customFields === 'string' && doc.customFields ? JSON.parse(doc.customFields) : {},
        assigneeIds: typeof doc.assigneeIds === 'string' && doc.assigneeIds ? JSON.parse(doc.assigneeIds) : [],
        // ✅ assignedTo and assignedToNames are array types in DB - use directly
        assignedTo: Array.isArray(doc.assignedTo) ? doc.assignedTo : [],
        assignedToNames: Array.isArray(doc.assignedToNames) ? doc.assignedToNames : [],
        blockedBy: doc.blockedBy ? (typeof doc.blockedBy === 'string' ? JSON.parse(doc.blockedBy) : doc.blockedBy) : [],
        blocks: doc.blocks ? (typeof doc.blocks === 'string' ? JSON.parse(doc.blocks) : doc.blocks) : [],
      })) as unknown as Task[];

      return tasks;
    },
    enabled: !!projectId,
  });
}

// Hook to get all tasks in a workspace (for dashboard)
export function useWorkspaceTasks(workspaceId?: string) {
  return useQuery({
    queryKey: ['workspace-tasks', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const response = await databases.listDocuments(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        [Query.equal('workspaceId', workspaceId), Query.orderDesc('$createdAt'), Query.limit(1000)]
      );

      // Parse JSON fields
      const tasks = response.documents.map(doc => ({
        ...doc,
        labels: typeof doc.labels === 'string' && doc.labels ? JSON.parse(doc.labels) : [],
        attachments: typeof doc.attachments === 'string' && doc.attachments ? JSON.parse(doc.attachments) : [],
        customFields: typeof doc.customFields === 'string' && doc.customFields ? JSON.parse(doc.customFields) : {},
        assigneeIds: typeof doc.assigneeIds === 'string' && doc.assigneeIds ? JSON.parse(doc.assigneeIds) : [],
        // ✅ assignedTo and assignedToNames are array types in DB - use directly
        assignedTo: Array.isArray(doc.assignedTo) ? doc.assignedTo : [],
        assignedToNames: Array.isArray(doc.assignedToNames) ? doc.assignedToNames : [],
        blockedBy: doc.blockedBy ? (typeof doc.blockedBy === 'string' ? JSON.parse(doc.blockedBy) : doc.blockedBy) : [],
        blocks: doc.blocks ? (typeof doc.blocks === 'string' ? JSON.parse(doc.blocks) : doc.blocks) : [],
      })) as unknown as Task[];

      return tasks;
    },
    enabled: !!workspaceId,
  });
}

export function useTask(taskId?: string) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) return null;

      const response = await databases.getDocument(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        taskId
      );

      // Parse JSON fields
      const task = {
        ...response,
        labels: typeof response.labels === 'string' && response.labels ? JSON.parse(response.labels) : [],
        attachments: typeof response.attachments === 'string' && response.attachments ? JSON.parse(response.attachments) : [],
        customFields: typeof response.customFields === 'string' && response.customFields ? JSON.parse(response.customFields) : {},
        assigneeIds: typeof response.assigneeIds === 'string' && response.assigneeIds ? JSON.parse(response.assigneeIds) : [],
        // ✅ assignedTo and assignedToNames are array types in DB - use directly
        assignedTo: Array.isArray(response.assignedTo) ? response.assignedTo : [],
        assignedToNames: Array.isArray(response.assignedToNames) ? response.assignedToNames : [],
        blockedBy: response.blockedBy ? (typeof response.blockedBy === 'string' ? JSON.parse(response.blockedBy) : response.blockedBy) : [],
        blocks: response.blocks ? (typeof response.blocks === 'string' ? JSON.parse(response.blocks) : response.blocks) : [],
      } as unknown as Task;

      return task;
    },
    enabled: !!taskId,
  });
}

// ✅ NEW: Get tasks linked to a specific Functional Requirement
export function useTasksByFunctionalRequirement(functionalRequirementId?: string) {
  return useQuery({
    queryKey: ['tasks', 'functional-requirement', functionalRequirementId],
    queryFn: async () => {
      if (!functionalRequirementId) return [];

      const response = await databases.listDocuments(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        [
          Query.equal('functionalRequirementId', functionalRequirementId),
          Query.orderAsc('position')
        ]
      );

      // Parse JSON fields
      const tasks = response.documents.map(doc => ({
        ...doc,
        labels: typeof doc.labels === 'string' && doc.labels ? JSON.parse(doc.labels) : [],
        attachments: typeof doc.attachments === 'string' && doc.attachments ? JSON.parse(doc.attachments) : [],
        customFields: typeof doc.customFields === 'string' && doc.customFields ? JSON.parse(doc.customFields) : {},
        assigneeIds: typeof doc.assigneeIds === 'string' && doc.assigneeIds ? JSON.parse(doc.assigneeIds) : [],
        assignedTo: Array.isArray(doc.assignedTo) ? doc.assignedTo : [],
        assignedToNames: Array.isArray(doc.assignedToNames) ? doc.assignedToNames : [],
        blockedBy: doc.blockedBy ? (typeof doc.blockedBy === 'string' ? JSON.parse(doc.blockedBy) : doc.blockedBy) : [],
        blocks: doc.blocks ? (typeof doc.blocks === 'string' ? JSON.parse(doc.blocks) : doc.blocks) : [],
      })) as unknown as Task[];

      return tasks;
    },
    enabled: !!functionalRequirementId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      projectId: string;
      projectCode: string;
      title: string;
      description?: string;
      status: TaskStatus;
      priority: TaskPriority;
      assigneeIds?: string[];
      createdBy: string;
      createdByName?: string;
      assignedBy?: string;
      assignedByName?: string;
      dueDate?: string;
      estimatedHours?: number;
      sprintId?: string;
      epicId?: string;
      functionalRequirementId?: string; // NEW: Link to FR
      parentTaskId?: string;
      labels?: string[];
    }) => {
      // DEFENSIVE: Validate workspaceId is provided
      if (!data.workspaceId) {
        throw new Error('Workspace ID is required. Please select a workspace first.');
      }

      // Get current tasks for counting
      const existingTasks = await databases.listDocuments(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        [Query.equal('projectId', data.projectId)]
      );

      let hierarchyId: string;

      if (data.parentTaskId) {
        // Subtask: inherit parent's hierarchy
        const parentTask = await databases.getDocument(
          DATABASE_ID,
          TASKS_COLLECTION_ID,
          data.parentTaskId
        );
        const parentHierarchyId = parentTask.hierarchyId;

        const siblings = existingTasks.documents.filter(
          t => t.parentTaskId === data.parentTaskId
        );
        const subtaskNumber = (siblings.length + 1).toString().padStart(2, '0');
        hierarchyId = `${parentHierarchyId}.${subtaskNumber}`;
      } else {
        // Top-level task: generate from FR → Sprint → Task hierarchy
        const topLevelTasks = existingTasks.documents.filter(t => !t.parentTaskId);
        const taskSequence = topLevelTasks.length + 1;

        if (data.functionalRequirementId && data.sprintId) {
          // Full hierarchy: FR → Sprint → Task
          try {
            const [fr, sprint] = await Promise.all([
              databases.getDocument(DATABASE_ID, FUNCTIONAL_REQUIREMENTS_COLLECTION_ID, data.functionalRequirementId),
              databases.getDocument(DATABASE_ID, SPRINTS_COLLECTION_ID, data.sprintId),
            ]);

            hierarchyId = generateTaskId(
              fr.hierarchyId, // FR hierarchy (e.g., PTE-RAU-EAU-FRL-01)
              sprint.name,
              data.title,
              taskSequence
            );
          } catch (error) {
            // Fallback if FR/Sprint not found
            console.error('Error fetching FR/Sprint:', error);
            hierarchyId = `${data.projectCode}-T${taskSequence.toString().padStart(2, '0')}`;
          }
        } else if (data.sprintId) {
          // Sprint but no FR: Project → Sprint → Task
          try {
            const [sprint, project] = await Promise.all([
              databases.getDocument(DATABASE_ID, SPRINTS_COLLECTION_ID, data.sprintId),
              databases.getDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, data.projectId),
            ]);

            hierarchyId = generateTaskIdWithoutFR(
              data.projectCode,
              project.name,
              sprint.name,
              data.title,
              taskSequence
            );
          } catch (error) {
            console.error('Error fetching Sprint:', error);
            hierarchyId = `${data.projectCode}-T${taskSequence.toString().padStart(2, '0')}`;
          }
        } else {
          // No FR or Sprint: Simple project task
          hierarchyId = `${data.projectCode}-T${taskSequence.toString().padStart(2, '0')}`;
        }
      }

      const taskData = {
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        hierarchyId,
        title: data.title,
        description: data.description || '',
        status: data.status,
        priority: data.priority,
        assigneeIds: JSON.stringify(data.assigneeIds || []),
        assignedTo: data.assigneeIds || [], // ✅ FIXED: Send as array, not string
        assignedToNames: [], // ✅ FIXED: Send as array, not string
        assignedBy: data.assignedBy || data.createdBy, // Who assigned (defaults to creator)
        assignedByName: data.assignedByName || data.createdByName || '', // Assignor name
        createdBy: data.createdBy,
        createdByName: data.createdByName || '', // Creator name for display
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours || 0,
        actualHours: 0,
        sprintId: data.sprintId,
        epicId: data.epicId,
        functionalRequirementId: data.functionalRequirementId, // NEW: Store FR link
        parentTaskId: data.parentTaskId,
        labels: JSON.stringify(data.labels || []),
        attachments: JSON.stringify([]),
        customFields: JSON.stringify({}),
        position: existingTasks.total,
        // Note: blockedBy and blocks attributes don't exist in DB due to Appwrite limits
        // They are handled safely with ?? [] when reading tasks
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        ID.unique(),
        taskData
      );

      return response as unknown as Task;
    },
    onSuccess: async (createdTask, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] });

      // Send notifications to assignees
      if (variables.assigneeIds && variables.assigneeIds.length > 0) {
        try {
          // Fetch project name for notification
          let projectName = variables.projectId;
          try {
            const project = await databases.getDocument(
              DATABASE_ID,
              PROJECTS_COLLECTION_ID,
              variables.projectId
            );
            projectName = project.name;
          } catch (error) {
            console.error('Failed to fetch project name:', error);
          }

          // Get assigner name
          const assignerName = variables.createdByName || variables.assignedByName || 'Team Member';

          // Send bulk notifications to all assignees
          await createBulkNotifications({
            workspaceId: variables.workspaceId,
            userIds: variables.assigneeIds,
            type: 'TASK_ASSIGNED',
            data: {
              taskId: createdTask.$id,
              taskTitle: variables.title,
              taskHierarchyId: createdTask.hierarchyId,
              projectName,
              assignerName,
              priority: variables.priority,
              dueDate: variables.dueDate,
              entityType: 'TASK',
            },
          });
        } catch (error) {
          // Don't fail task creation if notification fails
          console.error('Failed to send assignment notifications:', error);
        }
      }

      toast({
        title: 'Success',
        description: 'Task created successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to create task',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      taskId: string;
      projectId: string;
      updates: Partial<Task>;
    }) => {
      const { taskId, updates } = data;

      // Stringify complex fields if they exist in updates
      const processedUpdates: any = { ...updates };
      if (updates.labels) {
        processedUpdates.labels = JSON.stringify(updates.labels);
      }
      if (updates.assigneeIds) {
        processedUpdates.assigneeIds = JSON.stringify(updates.assigneeIds);
      }
      if (updates.attachments) {
        processedUpdates.attachments = JSON.stringify(updates.attachments);
      }
      if (updates.customFields) {
        processedUpdates.customFields = JSON.stringify(updates.customFields);
      }

      // ✅ Handle assignedTo and assignedToNames as arrays (not strings)
      // These fields are array types in the database
      if (updates.assignedTo !== undefined) {
        processedUpdates.assignedTo = Array.isArray(updates.assignedTo)
          ? updates.assignedTo
          : [];
      }
      if (updates.assignedToNames !== undefined) {
        processedUpdates.assignedToNames = Array.isArray(updates.assignedToNames)
          ? updates.assignedToNames
          : [];
      }

      // ✅ Handle assignedBy and assignedByName (who assigned the task)
      // These should be updated when task assignment changes
      if (updates.assignedBy !== undefined) {
        processedUpdates.assignedBy = updates.assignedBy;
      }
      if (updates.assignedByName !== undefined) {
        processedUpdates.assignedByName = updates.assignedByName;
      }

      const response = await databases.updateDocument(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        taskId,
        processedUpdates
      );

      return response as unknown as Task;
    },
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks', data.projectId] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', data.projectId]);

      // Optimistically update the cache
      queryClient.setQueryData<Task[]>(['tasks', data.projectId], (old) => {
        if (!old) return old;
        return old.map(task =>
          task.$id === data.taskId
            ? { ...task, ...data.updates }
            : task
        );
      });

      return { previousTasks };
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', variables.projectId], context.previousTasks);
      }
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to update task',
        variant: 'destructive',
      });
    },
    onSuccess: async (updatedTask, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] });

      // ✅ AUTO-SYNC FR STATUS: If task is linked to FR and status changed, update FR status
      if (updatedTask.functionalRequirementId && variables.updates.status) {
        try {
          // Get all tasks linked to this FR
          const frTasks = await databases.listDocuments(
            DATABASE_ID,
            TASKS_COLLECTION_ID,
            [Query.equal('functionalRequirementId', updatedTask.functionalRequirementId)]
          );

          // Calculate new FR status from all its tasks
          const tasks = frTasks.documents as unknown as Task[];
          const allDone = tasks.length > 0 && tasks.every(t => t.status === 'DONE');
          const anyInProgress = tasks.some(t => t.status === 'IN_PROGRESS' || t.status === 'REVIEW');

          let newFRStatus: FunctionalRequirement['status'];
          // If there are no tasks linked, FR should remain or become DRAFT
          if (tasks.length === 0) {
            newFRStatus = 'DRAFT';
          } else if (allDone) {
            newFRStatus = 'TESTED'; // All tasks complete = FR is tested
          } else if (anyInProgress) {
            newFRStatus = 'IMPLEMENTED'; // Some tasks in progress
          } else {
            newFRStatus = 'APPROVED'; // Tasks exist but none started
          }

          // Update FR status
          await databases.updateDocument(
            DATABASE_ID,
            FUNCTIONAL_REQUIREMENTS_COLLECTION_ID,
            updatedTask.functionalRequirementId,
            { status: newFRStatus }
          );

          // Invalidate FR queries
          queryClient.invalidateQueries({
            queryKey: ['functional-requirement', updatedTask.functionalRequirementId],
          });
          queryClient.invalidateQueries({
            queryKey: ['functional-requirements', variables.projectId],
          });

        } catch (error) {
          console.error('Error syncing FR status:', error);
          // Don't fail the task update if FR sync fails
        }
      }

      // Create notifications for task updates
      const { updates } = variables;

      // Fetch project name for notifications
      let projectName = updatedTask.projectId;
      try {
        const project = await databases.getDocument(
          DATABASE_ID,
          PROJECTS_COLLECTION_ID,
          updatedTask.projectId
        );
        projectName = project.name;
      } catch (error) {
        // Fallback to projectId if fetch fails
        console.error('Failed to fetch project name:', error);
      }

      // Get assigner name from updates context
      const assignerName = updates.assignedByName || updatedTask.createdByName || 'Team Member';

      // Notification for task assignment changes
      if (updates.assigneeIds) {
        const previousTask = queryClient.getQueryData<Task[]>(['tasks', variables.projectId])
          ?.find(t => t.$id === variables.taskId);

        if (previousTask) {
          // Ensure assigneeIds is an array
          const updatesAssignees = Array.isArray(updates.assigneeIds)
            ? updates.assigneeIds
            : typeof updates.assigneeIds === 'string'
              ? [updates.assigneeIds]
              : [];

          const previousAssignees = Array.isArray(previousTask.assigneeIds)
            ? previousTask.assigneeIds
            : [];

          const newAssignees = updatesAssignees.filter(
            id => id && typeof id === 'string' && !previousAssignees.includes(id)
          );

          // Notify newly assigned users
          if (newAssignees.length > 0) {
            await createBulkNotifications({
              workspaceId: updatedTask.workspaceId || '',
              userIds: newAssignees,
              type: 'TASK_ASSIGNED',
              data: {
                taskId: updatedTask.$id,
                taskTitle: updatedTask.title,
                projectId: updatedTask.projectId,
                projectName: projectName,
                assignerName: assignerName,
                entityType: 'TASK',
              },
            });
          }
        }
      }

      // Notification for priority changes
      if (updates.priority) {
        // Ensure assignees is always an array
        const assigneesData = updatedTask.assigneeIds || [];
        const assignees = Array.isArray(assigneesData)
          ? assigneesData
          : typeof assigneesData === 'string'
            ? [assigneesData]
            : [];

        const validAssignees = assignees.filter(id => id && typeof id === 'string' && id.trim() !== '');

        if (validAssignees.length > 0) {
          await createBulkNotifications({
            workspaceId: updatedTask.workspaceId || '',
            userIds: validAssignees,
            type: 'TASK_PRIORITY_CHANGED',
            data: {
              taskId: updatedTask.$id,
              taskTitle: updatedTask.title,
              projectId: updatedTask.projectId,
              projectName: projectName,
              changerName: assignerName,
              newPriority: updates.priority,
              entityType: 'TASK',
            },
          });
        }
      }

      toast({
        title: 'Success',
        description: 'Task updated successfully!',
      });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      taskId: string;
      projectId: string;
      status: TaskStatus;
      position: number;
    }) => {
      const { taskId, status, position } = data;

      const response = await databases.updateDocument(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        taskId,
        { status, position }
      );

      return response as unknown as Task;
    },
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks', data.projectId] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', data.projectId]);

      // Optimistically update the cache
      queryClient.setQueryData<Task[]>(['tasks', data.projectId], (old) => {
        if (!old) return old;
        return old.map(task =>
          task.$id === data.taskId
            ? { ...task, status: data.status, position: data.position }
            : task
        );
      });

      return { previousTasks };
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', variables.projectId], context.previousTasks);
      }
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to update task status',
        variant: 'destructive',
      });
    },
    onSuccess: async (updatedTask, variables) => {
      // Silent success, already updated optimistically
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] });

      // Fetch project name for notifications
      let projectName = updatedTask.projectId;
      try {
        const project = await databases.getDocument(
          DATABASE_ID,
          PROJECTS_COLLECTION_ID,
          updatedTask.projectId
        );
        projectName = project.name;
      } catch (error) {
        console.error('Failed to fetch project name:', error);
      }

      // Create notification if task was completed - notify managers for review
      if (variables.status === 'DONE') {
        try {
          // Query workspace members to find managers/admins
          const WORKSPACE_MEMBERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_WORKSPACE_MEMBERS_ID!;
          const membersResponse = await databases.listDocuments(
            DATABASE_ID,
            WORKSPACE_MEMBERS_COLLECTION_ID,
            [Query.equal('workspaceId', updatedTask.workspaceId)]
          );

          // Filter for managers and admins
          const managers = membersResponse.documents
            .filter((member: any) => {
              const role = member.role?.toLowerCase() || '';
              return role.includes('manager') || role.includes('admin') || role === 'owner';
            })
            .map((member: any) => member.userId)
            .filter((userId: string) => userId && userId !== updatedTask.createdBy); // Exclude the completer

          // Send notifications to managers for review
          if (managers.length > 0) {
            await createBulkNotifications({
              workspaceId: updatedTask.workspaceId || '',
              userIds: managers,
              type: 'TASK_COMPLETED',
              data: {
                taskId: updatedTask.$id,
                taskTitle: updatedTask.title,
                taskHierarchyId: updatedTask.hierarchyId,
                projectId: updatedTask.projectId,
                projectName: projectName,
                completerName: updatedTask.createdByName || 'Team Member',
                entityType: 'TASK',
              },
            });
          }
        } catch (error) {
          // Don't fail status update if notification fails
          console.error('Failed to send completion notifications:', error);
        }
      }

      // Create notification for status changes (except to DONE, already handled)
      if (variables.status !== 'DONE') {
        // Ensure assignees is always an array
        const assigneesData = updatedTask.assigneeIds || [];
        const assignees = Array.isArray(assigneesData)
          ? assigneesData
          : typeof assigneesData === 'string'
            ? [assigneesData]
            : [];

        const validAssignees = assignees.filter(id => id && typeof id === 'string' && id.trim() !== '');

        if (validAssignees.length > 0) {
          await createBulkNotifications({
            workspaceId: updatedTask.workspaceId || '',
            userIds: validAssignees,
            type: 'TASK_STATUS_CHANGED',
            data: {
              taskId: updatedTask.$id,
              taskTitle: updatedTask.title,
              projectId: updatedTask.projectId,
              projectName: projectName,
              changerName: updatedTask.createdByName || 'Team Member',
              newStatus: variables.status,
              entityType: 'TASK',
            },
          });
        }
      }
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { taskId: string; projectId: string }) => {
      await databases.deleteDocument(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        data.taskId
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.projectId] });
      toast({
        title: 'Success',
        description: 'Task deleted successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to delete task',
        variant: 'destructive',
      });
    },
  });
}

export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      tasks: { taskId: string; position: number }[];
      projectId: string;
    }) => {
      // Update positions for multiple tasks
      const updates = data.tasks.map((task) =>
        databases.updateDocument(
          DATABASE_ID,
          TASKS_COLLECTION_ID,
          task.taskId,
          { position: task.position }
        )
      );

      await Promise.all(updates);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to reorder tasks',
        variant: 'destructive',
      });
    },
  });
}

export function useAddTaskDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // NOTE: Task dependencies disabled due to Appwrite attribute limit
      // The tasks collection has reached its maximum attribute count/size
      // blockedBy and blocks attributes cannot be added
      throw new Error('Task dependencies are currently disabled due to database limits. Contact admin to upgrade database plan.');

      /* Original implementation disabled:
      try {
        // Get current task
        const task = await databases.getDocument(
          DATABASE_ID,
          TASKS_COLLECTION_ID,
          data.taskId
        );

        // Parse dependency arrays
        const blockedBy = typeof task.blockedBy === 'string' 
          ? JSON.parse(task.blockedBy || '[]') 
          : task.blockedBy || [];
        const blocks = typeof task.blocks === 'string' 
          ? JSON.parse(task.blocks || '[]') 
          : task.blocks || [];

        // Add dependency
        if (data.type === 'blockedBy' && !blockedBy.includes(data.targetTaskId)) {
          blockedBy.push(data.targetTaskId);
        } else if (data.type === 'blocks' && !blocks.includes(data.targetTaskId)) {
          blocks.push(data.targetTaskId);
        }

        // Update task
        await databases.updateDocument(
          DATABASE_ID,
          TASKS_COLLECTION_ID,
          data.taskId,
          {
            blockedBy: JSON.stringify(blockedBy),
            blocks: JSON.stringify(blocks),
          }
        );

        // Also update the target task's opposite relationship
        const targetTask = await databases.getDocument(
          DATABASE_ID,
          TASKS_COLLECTION_ID,
          data.targetTaskId
        );

        const targetBlockedBy = typeof targetTask.blockedBy === 'string' 
          ? JSON.parse(targetTask.blockedBy || '[]') 
          : targetTask.blockedBy || [];
        const targetBlocks = typeof targetTask.blocks === 'string' 
          ? JSON.parse(targetTask.blocks || '[]') 
          : targetTask.blocks || [];

        if (data.type === 'blockedBy' && !targetBlocks.includes(data.taskId)) {
          targetBlocks.push(data.taskId);
        } else if (data.type === 'blocks' && !targetBlockedBy.includes(data.taskId)) {
          targetBlockedBy.push(data.taskId);
        }

        await databases.updateDocument(
          DATABASE_ID,
          TASKS_COLLECTION_ID,
          data.targetTaskId,
          {
            blockedBy: JSON.stringify(targetBlockedBy),
            blocks: JSON.stringify(targetBlocks),
          }
        );

        return data;
      } catch (error: unknown) {
        // Check if error is due to missing attributes
        if ((error instanceof Error ? error.message : String(error))?.includes('Unknown attribute') && 
            ((error instanceof Error ? error.message : String(error))?.includes('blockedBy') || (error instanceof Error ? error.message : String(error))?.includes('blocks'))) {
          throw new Error('Database schema missing dependency attributes. Please add "blockedBy" and "blocks" to Tasks collection. See APPWRITE_SCHEMA_MIGRATION.md');
        }
        throw error;
      }
      */
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-tasks'] });
      toast({
        title: 'Dependency added',
        description: 'Task dependency has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Dependencies disabled',
        description: (error instanceof Error ? error.message : String(error)),
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveTaskDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // NOTE: Task dependencies disabled due to Appwrite attribute limit
      // The tasks collection has reached its maximum attribute count/size
      // blockedBy and blocks attributes cannot be added
      throw new Error('Task dependencies are currently disabled due to database limits. Contact admin to upgrade database plan.');

      /* Original implementation disabled:
      // Get current task
      const task = await databases.getDocument(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        data.taskId
      );

      // Parse dependency arrays
      let blockedBy = typeof task.blockedBy === 'string' 
        ? JSON.parse(task.blockedBy || '[]') 
        : task.blockedBy || [];
      let blocks = typeof task.blocks === 'string' 
        ? JSON.parse(task.blocks || '[]') 
        : task.blocks || [];

      // Remove dependency
      if (data.type === 'blockedBy') {
        blockedBy = blockedBy.filter((id: string) => id !== data.targetTaskId);
      } else if (data.type === 'blocks') {
        blocks = blocks.filter((id: string) => id !== data.targetTaskId);
      }

      // Update task
      await databases.updateDocument(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        data.taskId,
        {
          blockedBy: JSON.stringify(blockedBy),
          blocks: JSON.stringify(blocks),
        }
      );

      // Also update the target task's opposite relationship
      const targetTask = await databases.getDocument(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        data.targetTaskId
      );

      let targetBlockedBy = typeof targetTask.blockedBy === 'string' 
        ? JSON.parse(targetTask.blockedBy || '[]') 
        : targetTask.blockedBy || [];
      let targetBlocks = typeof targetTask.blocks === 'string' 
        ? JSON.parse(targetTask.blocks || '[]') 
        : targetTask.blocks || [];

      if (data.type === 'blockedBy') {
        targetBlocks = targetBlocks.filter((id: string) => id !== data.taskId);
      } else if (data.type === 'blocks') {
        targetBlockedBy = targetBlockedBy.filter((id: string) => id !== data.taskId);
      }

      await databases.updateDocument(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        data.targetTaskId,
        {
          blockedBy: JSON.stringify(targetBlockedBy),
          blocks: JSON.stringify(targetBlocks),
        }
      );

      return data;
      */
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-tasks'] });
      toast({
        title: 'Dependency removed',
        description: 'Task dependency has been removed successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Dependencies disabled',
        description: (error instanceof Error ? error.message : String(error)),
        variant: 'destructive',
      });
    },
  });
}

