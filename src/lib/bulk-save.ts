import { Client, Databases } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

// For server-side operations, set the API key
if (process.env.APPWRITE_API_KEY) {
  client.setKey(process.env.APPWRITE_API_KEY);
}

export const databases = new Databases(client);
import { ID } from 'node-appwrite';
import type { GeneratedHierarchy } from '@/lib/ai-generator';
import { logger } from '@/lib/logger';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const CLIENT_REQUIREMENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CLIENT_REQUIREMENTS_COLLECTION_ID!;
const FUNCTIONAL_REQUIREMENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_REQUIREMENTS_COLLECTION_ID!;
const EPICS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EPICS_COLLECTION_ID!;
const TASKS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!;

export interface BulkSaveResult {
  clientRequirements: Array<{ id: string; hierarchyId: string }>;
  functionalRequirements: Array<{ id: string; hierarchyId: string }>;
  epics: Array<{ id: string; hierarchyId: string }>;
  tasks: Array<{ id: string; hierarchyId: string }>;
}

export async function bulkSaveGeneratedHierarchy(
  generated: GeneratedHierarchy,
  projectId: string,
  projectCode: string,
  workspaceId: string,
  userId: string
): Promise<BulkSaveResult> {
  const result: BulkSaveResult = {
    clientRequirements: [],
    functionalRequirements: [],
    epics: [],
    tasks: [],
  };

  try {
    // Step 1: Save Client Requirements
    logger.debug('Saving client requirements');
    for (let i = 0; i < generated.clientRequirements.length; i++) {
      const cr = generated.clientRequirements[i];
      const crDoc = await databases.createDocument(
        DATABASE_ID,
        CLIENT_REQUIREMENTS_COLLECTION_ID,
        ID.unique(),
        {
          workspaceId,
          projectId,
          title: cr.title,
          clientName: cr.clientName,
          description: cr.description,
          priority: cr.priority,
          status: 'DRAFT',
          attachments: JSON.stringify([]),
          createdBy: userId,
        }
      );
      result.clientRequirements.push({
        id: crDoc.$id,
        hierarchyId: `CR-${String(i + 1).padStart(2, '0')}`,
      });
    }

    // Step 2: Save Functional Requirements (with hierarchy)
    logger.debug('Saving functional requirements');
    const frIdMap = new Map<string, string>(); // Map parentId to actual DB ID

    // First pass: Create top-level requirements
    const topLevelFRs = generated.functionalRequirements.filter(fr => !fr.parentId);
    for (let i = 0; i < topLevelFRs.length; i++) {
      const fr = topLevelFRs[i];
      const hierarchyId = `REQ-${String(i + 1).padStart(2, '0')}`;

      const frDoc = await databases.createDocument(
        DATABASE_ID,
        FUNCTIONAL_REQUIREMENTS_COLLECTION_ID,
        ID.unique(),
        {
          workspaceId,
          projectId,
          hierarchyId,
          clientRequirementId: result.clientRequirements[0]?.id || '',
          parentRequirementId: '',
          title: fr.title,
          description: fr.description,
          type: fr.type,
          priority: fr.priority,
          complexity: fr.complexity,
          status: 'DRAFT',
          acceptanceCriteria: JSON.stringify(fr.acceptanceCriteria || []),
          businessRules: JSON.stringify(fr.businessRules || []),
          dependencies: JSON.stringify([]),
          tags: JSON.stringify([]),
          isReusable: false,
          version: '1.0.0',
          linkedProjectIds: JSON.stringify([]),
          createdBy: userId,
        }
      );

      frIdMap.set(`fr-${i}`, frDoc.$id);
      result.functionalRequirements.push({
        id: frDoc.$id,
        hierarchyId,
      });
    }

    // Second pass: Create child requirements (if any)
    const childFRs = generated.functionalRequirements.filter(fr => fr.parentId);
    for (const fr of childFRs) {
      const parentDbId = frIdMap.get(fr.parentId || '');
      if (!parentDbId) continue;

      // Get parent to determine hierarchyId
      const parent = await databases.getDocument(
        DATABASE_ID,
        FUNCTIONAL_REQUIREMENTS_COLLECTION_ID,
        parentDbId
      );

      const parentHierarchyId = parent.hierarchyId;
      const siblingCount = result.functionalRequirements.filter(
        r => r.hierarchyId.startsWith(parentHierarchyId + '.')
      ).length;
      const childHierarchyId = `${parentHierarchyId}.${String(siblingCount + 1).padStart(2, '0')}`;

      const frDoc = await databases.createDocument(
        DATABASE_ID,
        FUNCTIONAL_REQUIREMENTS_COLLECTION_ID,
        ID.unique(),
        {
          workspaceId,
          projectId,
          hierarchyId: childHierarchyId,
          clientRequirementId: result.clientRequirements[0]?.id || '',
          parentRequirementId: parentDbId,
          title: fr.title,
          description: fr.description,
          type: fr.type,
          priority: fr.priority,
          complexity: fr.complexity,
          status: 'DRAFT',
          acceptanceCriteria: JSON.stringify(fr.acceptanceCriteria || []),
          businessRules: JSON.stringify(fr.businessRules || []),
          dependencies: JSON.stringify([]),
          tags: JSON.stringify([]),
          isReusable: false,
          version: '1.0.0',
          linkedProjectIds: JSON.stringify([]),
          createdBy: userId,
        }
      );

      result.functionalRequirements.push({
        id: frDoc.$id,
        hierarchyId: childHierarchyId,
      });
    }

    // Step 3: Save Epics
    logger.debug('Saving epics');
    for (let i = 0; i < generated.epics.length; i++) {
      const epic = generated.epics[i];
      const epicHierarchyId = `${projectCode}-EPIC-${String(i + 1).padStart(2, '0')}`;

      // Link to first matching functional requirement if available
      const linkedFRId = epic.functionalRequirementIds && epic.functionalRequirementIds.length > 0
        ? result.functionalRequirements[0]?.id || ''
        : '';

      const epicDoc = await databases.createDocument(
        DATABASE_ID,
        EPICS_COLLECTION_ID,
        ID.unique(),
        {
          workspaceId,
          projectId,
          hierarchyId: epicHierarchyId,
          name: epic.name,
          description: epic.description || '',
          color: epic.color || '#3b82f6',
          startDate: epic.startDate || '',
          endDate: epic.endDate || '',
          status: 'TODO',
          progress: 0,
          functionalRequirementId: linkedFRId,
          createdBy: userId,
        }
      );

      result.epics.push({
        id: epicDoc.$id,
        hierarchyId: epicHierarchyId,
      });
    }

    // Step 4: Save Tasks
    logger.debug('Saving tasks');
    for (let i = 0; i < generated.tasks.length; i++) {
      const task = generated.tasks[i];
      const taskHierarchyId = `${projectCode}-${String(i + 1).padStart(3, '0')}`;

      // Link to epic if specified
      const epicDbId = task.epicId ? result.epics[parseInt(task.epicId)]?.id || '' : '';

      const taskDoc = await databases.createDocument(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        ID.unique(),
        {
          workspaceId,
          projectId,
          hierarchyId: taskHierarchyId,
          title: task.title,
          description: task.description,
          status: 'TODO',
          priority: task.priority,
          assigneeIds: JSON.stringify([]),
          createdBy: userId,
          dueDate: '',
          estimatedHours: task.estimatedHours || 0,
          actualHours: 0,
          // storyPoints removed from schema
          sprintId: '',
          epicId: epicDbId,
          parentTaskId: '',
          labels: JSON.stringify(task.labels || []),
          attachments: JSON.stringify([]),
          customFields: JSON.stringify({}),
          position: i,
        }
      );

      result.tasks.push({
        id: taskDoc.$id,
        hierarchyId: taskHierarchyId,
      });
    }

    logger.info('Bulk save complete', result);
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error';
    logger.error('Bulk save error', { error: errorMessage });
    throw new Error(`Failed to save generated data: ${errorMessage}`);
  }
}
