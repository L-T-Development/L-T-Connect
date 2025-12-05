'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { ID, Query } from 'appwrite';
import { toast } from '@/hooks/use-toast';
import { 
  generateFRId, 
  generateFRIdWithEpicOnly, 
  generateFRIdStandalone,
  generateTaskId 
} from '@/lib/hierarchy-id-generator';
import type { FunctionalRequirement, FunctionalRequirementStatus, Task } from '@/types';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_REQUIREMENTS_COLLECTION_ID!;
const TASKS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!;
const PROJECTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECTS_COLLECTION_ID!;
const SPRINTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_SPRINTS_COLLECTION_ID!;
const EPICS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EPICS_COLLECTION_ID!;
const CLIENT_REQUIREMENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CLIENT_REQUIREMENTS_COLLECTION_ID!;

// ✅ Utility: Calculate FR status from linked tasks
export function calculateFRStatusFromTasks(tasks: Task[]): FunctionalRequirement['status'] {
  if (!tasks || tasks.length === 0) return 'DRAFT';

  const allDone = tasks.every(t => t.status === 'DONE');
  const anyInProgress = tasks.some(t => t.status === 'IN_PROGRESS' || t.status === 'REVIEW');
  const anyTodo = tasks.some(t => t.status === 'TODO');
  
  // FR lifecycle: DRAFT → REVIEW → APPROVED → IMPLEMENTED → TESTED → DEPLOYED
  if (allDone) {
    // All tasks done - mark as TESTED (ready for deployment)
    return 'TESTED';
  } else if (anyInProgress) {
    // Some tasks in progress - mark as IMPLEMENTED (being developed)
    return 'IMPLEMENTED';
  } else if (anyTodo) {
    // Tasks exist but not started - mark as APPROVED (ready to work on)
    return 'APPROVED';
  } else {
    // Default state
    return 'DRAFT';
  }
}

// Fetch all functional requirements for a project
export function useFunctionalRequirements(projectId?: string) {
  return useQuery({
    queryKey: ['functional-requirements', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
          Query.equal('projectId', projectId),
          Query.orderDesc('$createdAt'),
        ]
      );

      return response.documents as unknown as FunctionalRequirement[];
    },
    enabled: !!projectId,
  });
}

// Fetch single functional requirement
export function useFunctionalRequirement(requirementId?: string) {
  return useQuery({
    queryKey: ['functional-requirement', requirementId],
    queryFn: async () => {
      if (!requirementId) return null;

      const response = await databases.getDocument(
        DATABASE_ID,
        COLLECTION_ID,
        requirementId
      );

      return response as unknown as FunctionalRequirement;
    },
    enabled: !!requirementId,
  });
}

// ✅ NEW: Get FRs by Epic (proper hierarchy)
export function useFunctionalRequirementsByEpic(epicId?: string) {
  return useQuery({
    queryKey: ['functional-requirements', 'epic', epicId],
    queryFn: async () => {
      if (!epicId) return [];

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
          Query.equal('epicId', epicId),
          Query.orderDesc('$createdAt'),
        ]
      );

      return response.documents as unknown as FunctionalRequirement[];
    },
    enabled: !!epicId,
  });
}

// ✅ NEW: Get FRs by Sprint
export function useFunctionalRequirementsBySprint(sprintId?: string) {
  return useQuery({
    queryKey: ['functional-requirements', 'sprint', sprintId],
    queryFn: async () => {
      if (!sprintId) return [];

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
          Query.equal('sprintId', sprintId),
          Query.orderDesc('$createdAt'),
        ]
      );

      return response.documents as unknown as FunctionalRequirement[];
    },
    enabled: !!sprintId,
  });
}

// Create functional requirement
export function useCreateFunctionalRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      projectId: string;
      projectCode: string;
      epicId?: string; // ✅ FIXED: Primary parent (epic)
      sprintId?: string; // ✅ NEW: Optional sprint assignment
      clientRequirementId?: string; // Keep for traceability
      parentRequirementId?: string;
      title: string;
      description?: string;
      type: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'TECHNICAL' | 'BUSINESS'; // Required type field
      complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; // ✅ NEW: Priority field
      status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'IMPLEMENTED' | 'TESTED' | 'DEPLOYED';
      reusable?: boolean;
      assignedTo?: string[]; // ✅ NEW: Team member assignments
      assignedToNames?: string[]; // ✅ NEW: Denormalized names
      tags?: string;
      linkedProjectIds?: string;
      createdBy: string;
      createdByName?: string;
    }) => {
      // ✅ NEW: Generate hierarchical ID based on parent entities
      let hierarchyId: string;

      if (data.parentRequirementId) {
        // Child requirement: Get parent's hierarchyId and generate child ID
        const parent = await databases.getDocument(
          DATABASE_ID,
          COLLECTION_ID,
          data.parentRequirementId
        );

        const parentHierarchyId = parent.hierarchyId;

        // Count siblings to determine the next number
        const siblings = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_ID,
          [
            Query.equal('projectId', data.projectId),
            Query.equal('parentRequirementId', data.parentRequirementId),
          ]
        );

        const childNumber = String(siblings.total + 1).padStart(2, '0');
        hierarchyId = `${parentHierarchyId}.${childNumber}`;
      } else {
        // Top-level requirement: Use hierarchical naming
        // Format: P{ProjCode}-R{ReqCode}-E{EpicCode}-FR{FRCode}-{Num}
        
        // Count existing FRs for sequence number
        const existingFRs = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_ID,
          [Query.equal('projectId', data.projectId)]
        );
        const sequenceNumber = existingFRs.total + 1;

        // Fetch project details
        const PROJECTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECTS_COLLECTION_ID!;
        const project = await databases.getDocument(
          DATABASE_ID,
          PROJECTS_COLLECTION_ID,
          data.projectId
        );
        const projectName = project.name || '';

        if (data.epicId) {
          // Has epic: Fetch epic and potentially requirement
          const EPICS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EPICS_COLLECTION_ID!;
          const epic = await databases.getDocument(
            DATABASE_ID,
            EPICS_COLLECTION_ID,
            data.epicId
          );
          const epicName = epic.name || '';

          if (epic.requirementId) {
            // Has requirement through epic
            const REQ_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CLIENT_REQUIREMENTS_COLLECTION_ID!;
            const requirement = await databases.getDocument(
              DATABASE_ID,
              REQ_COLLECTION_ID,
              epic.requirementId
            );
            const requirementName = requirement.title || '';

            // Full hierarchy: P-R-E-FR
            hierarchyId = generateFRId(
              data.projectCode,
              projectName,
              requirementName,
              epicName,
              data.title,
              sequenceNumber
            );
          } else {
            // Epic only: P-E-FR
            hierarchyId = generateFRIdWithEpicOnly(
              data.projectCode,
              projectName,
              epicName,
              data.title,
              sequenceNumber
            );
          }
        } else {
          // No epic or requirement: P-FR
          hierarchyId = generateFRIdStandalone(
            data.projectCode,
            projectName,
            data.title,
            sequenceNumber
          );
        }
      }

      const requirementData = {
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        epicId: data.epicId || '', // ✅ FIXED: Link to parent epic
        sprintId: data.sprintId || '', // ✅ NEW: Optional sprint assignment
        clientRequirementId: data.clientRequirementId || '',
        parentRequirementId: data.parentRequirementId || '',
        hierarchyId,
        title: data.title,
        description: data.description || '',
        type: data.type, // Required type field
        complexity: data.complexity,
        priority: data.priority || 'MEDIUM', // ✅ NEW: Priority with default
        status: data.status,
        reusable: data.reusable || false,
        assignedTo: data.assignedTo || [], // ✅ NEW: Team assignments
        assignedToNames: data.assignedToNames || [], // ✅ NEW: Denormalized names
        tags: data.tags || '',
        linkedProjectIds: data.linkedProjectIds || '',
        createdBy: data.createdBy,
        createdByName: data.createdByName || '',
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        requirementData
      );

      return response as unknown as FunctionalRequirement;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['functional-requirements', variables.projectId] });
      if (variables.epicId) {
        queryClient.invalidateQueries({ queryKey: ['functional-requirements', 'epic', variables.epicId] });
      }
      if (variables.sprintId) {
        queryClient.invalidateQueries({ queryKey: ['functional-requirements', 'sprint', variables.sprintId] });
      }
      if (variables.clientRequirementId) {
        queryClient.invalidateQueries({ queryKey: ['client-requirement', variables.clientRequirementId] });
      }
      toast({
        title: 'Success',
        description: 'Functional requirement created successfully!',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to create functional requirement',
        variant: 'destructive',
      });
    },
  });
}

// Update functional requirement
export function useUpdateFunctionalRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      requirementId: string;
      projectId: string;
      updates: Partial<FunctionalRequirement>;
      previousSprintId?: string; // Track if sprint assignment is new
    }) => {
      const { requirementId, projectId, updates, previousSprintId } = data;

      // Process updates - no need to stringify since new fields are simple strings
      const processedUpdates: any = { ...updates };

      const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        requirementId,
        processedUpdates
      );

      const updatedFR = response as unknown as FunctionalRequirement;

      // ✅ AUTO-CREATE TASK when FR is assigned to sprint for the first time
      const isNewSprintAssignment = updates.sprintId && updates.sprintId !== previousSprintId;
      
      if (isNewSprintAssignment && updates.sprintId) {
        try {
          // Get existing tasks to calculate position
          const existingTasks = await databases.listDocuments(
            DATABASE_ID,
            TASKS_COLLECTION_ID,
            [Query.equal('projectId', projectId)]
          );

          const topLevelTasks = existingTasks.documents.filter((t: any) => !t.parentTaskId);
          const taskSequence = topLevelTasks.length + 1;

          // Get sprint and FR for hierarchy generation
          const sprint = await databases.getDocument(
            DATABASE_ID,
            SPRINTS_COLLECTION_ID,
            updates.sprintId
          );

          // Generate hierarchyId: FR → Sprint → Task
          const hierarchyId = generateTaskId(
            updatedFR.hierarchyId,
            sprint.name,
            updatedFR.title,
            taskSequence
          );

          // Create task linked to FR (storyPoints removed)
          const taskData = {
            workspaceId: updatedFR.workspaceId,
            projectId: projectId,
            hierarchyId,
            title: updatedFR.title,
            description: updatedFR.description || `Task auto-created from FR: ${updatedFR.hierarchyId}`,
            status: 'TODO' as const,
            priority: updatedFR.priority || 'MEDIUM',
            assignedTo: updatedFR.assignedTo || [],
            assignedToNames: updatedFR.assignedToNames || [],
            assignedBy: updatedFR.createdBy,
            assignedByName: updatedFR.createdByName || '',
            createdBy: updatedFR.createdBy,
            createdByName: updatedFR.createdByName || '',
            dueDate: undefined,
            estimatedHours: 0,
            actualHours: 0,
            sprintId: updates.sprintId,
            epicId: updatedFR.epicId,
            functionalRequirementId: requirementId, // ✅ Link back to FR
            parentTaskId: undefined,
            labels: JSON.stringify([]),
            attachments: JSON.stringify([]),
            customFields: JSON.stringify({}),
            position: existingTasks.total,
          };

          await databases.createDocument(
            DATABASE_ID,
            TASKS_COLLECTION_ID,
            ID.unique(),
            taskData
          );

          // Invalidate task queries to show new task
          queryClient.invalidateQueries({
            queryKey: ['tasks', projectId],
          });

          toast({
            title: 'Task Created',
            description: `Auto-created task for FR: ${updatedFR.hierarchyId}`,
          });
        } catch (error) {
          console.error('Error auto-creating task:', error);
          // Don't fail the FR update if task creation fails
          toast({
            title: 'Warning',
            description: 'FR updated but task creation failed. Please create task manually.',
            variant: 'destructive',
          });
        }
      }

      return updatedFR;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['functional-requirements', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['functional-requirement', variables.requirementId] });
      
      // ✅ Invalidate epic and sprint queries if those fields were updated
      if (result.epicId) {
        queryClient.invalidateQueries({ queryKey: ['functional-requirements', 'epic', result.epicId] });
      }
      if (result.sprintId) {
        queryClient.invalidateQueries({ queryKey: ['functional-requirements', 'sprint', result.sprintId] });
      }
      
      toast({
        title: 'Success',
        description: 'Functional requirement updated successfully!',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to update functional requirement',
        variant: 'destructive',
      });
    },
  });
}

// Delete functional requirement
export function useDeleteFunctionalRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { requirementId: string; projectId: string }) => {
      // Check for child requirements
      const children = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [Query.equal('parentRequirementId', data.requirementId)]
      );

      if (children.total > 0) {
        throw new Error(
          'Cannot delete requirement with child requirements. Delete children first.'
        );
      }

      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTION_ID,
        data.requirementId
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['functional-requirements', variables.projectId] });
      toast({
        title: 'Success',
        description: 'Functional requirement deleted successfully!',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to delete functional requirement',
        variant: 'destructive',
      });
    },
  });
}

// ✅ NEW: Clone/Reuse functional requirement to another project
export function useCloneFunctionalRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      requirementId: string;
      targetProjectId: string;
      targetProjectCode: string;
      targetEpicId?: string;
      targetClientRequirementId?: string;
    }) => {
      const { requirementId, targetProjectId, targetProjectCode, targetEpicId, targetClientRequirementId } = data;

      // Fetch original FR
      const originalFR = await databases.getDocument(
        DATABASE_ID,
        COLLECTION_ID,
        requirementId
      ) as unknown as FunctionalRequirement;

      // Get target project details for hierarchy generation
      const targetProject = await databases.getDocument(
        DATABASE_ID,
        PROJECTS_COLLECTION_ID,
        targetProjectId
      );

      // Get existing FRs in target project to calculate sequence
      const existingFRs = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [Query.equal('projectId', targetProjectId)]
      );

      const frSequence = existingFRs.total + 1;

      // Generate new hierarchyId based on target project structure
      let newHierarchyId: string;
      
      if (targetEpicId) {
        // If targeting an epic, fetch it and generate FR ID with epic
        const targetEpic = await databases.getDocument(
          DATABASE_ID,
          EPICS_COLLECTION_ID,
          targetEpicId
        );

        if (targetClientRequirementId) {
          // Full hierarchy: Project → Client Req → Epic → FR
          const targetClientReq = await databases.getDocument(
            DATABASE_ID,
            CLIENT_REQUIREMENTS_COLLECTION_ID,
            targetClientRequirementId
          );
          
          newHierarchyId = generateFRId(
            targetProjectCode,
            targetProject.name,
            targetClientReq.name,
            targetEpic.name,
            originalFR.title,
            frSequence
          );
        } else {
          // Project → Epic → FR (no client requirement)
          newHierarchyId = generateFRIdWithEpicOnly(
            targetProjectCode,
            targetProject.name,
            targetEpic.name,
            originalFR.title,
            frSequence
          );
        }
      } else {
        // Standalone FR (no epic)
        newHierarchyId = generateFRIdStandalone(
          targetProjectCode,
          targetProject.name,
          originalFR.title,
          frSequence
        );
      }

      // Create cloned FR with new project/hierarchy, reset sprint assignment
      const clonedFRData = {
        workspaceId: targetProject.workspaceId,
        projectId: targetProjectId,
        hierarchyId: newHierarchyId,
        title: originalFR.title,
        description: `${originalFR.description}\n\n(Cloned from ${originalFR.hierarchyId})`,
        complexity: originalFR.complexity,
        priority: originalFR.priority,
        status: 'DRAFT' as FunctionalRequirementStatus,
        epicId: targetEpicId || '',
        clientRequirementId: targetClientRequirementId || '',
        sprintId: '',
        reusable: originalFR.reusable || false,
        assignedTo: [],
        assignedToNames: [],
        createdBy: originalFR.createdBy,
        createdByName: originalFR.createdByName,
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        clonedFRData
      );

      return response as unknown as FunctionalRequirement;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['functional-requirements', variables.targetProjectId],
      });

      if (result.epicId) {
        queryClient.invalidateQueries({
          queryKey: ['functional-requirements', 'epic', result.epicId],
        });
      }

      toast({
        title: 'FR Cloned Successfully!',
        description: `${result.hierarchyId} created in target project`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to clone functional requirement',
        variant: 'destructive',
      });
    },
  });
}
