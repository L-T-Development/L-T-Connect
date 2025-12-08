import { NextRequest, NextResponse } from 'next/server';
import { serverDatabases } from '@/lib/appwrite-server';
import { ID } from 'node-appwrite';
import { logger } from '@/lib/logger';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const CLIENT_REQUIREMENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CLIENT_REQUIREMENTS_COLLECTION_ID!;
const FUNCTIONAL_REQUIREMENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_REQUIREMENTS_COLLECTION_ID!;
const EPICS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EPICS_COLLECTION_ID!;
const TASKS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { generated, projectId, projectCode, workspaceId, userId } = body;

    logger.debug('Starting bulk save', {
      projectId,
      projectCode,
      workspaceId,
      userId,
      counts: {
        clientRequirements: generated.clientRequirements?.length || 0,
        functionalRequirements: generated.functionalRequirements?.length || 0,
        epics: generated.epics?.length || 0,
        tasks: generated.tasks?.length || 0,
      },
    });

    const result = {
      clientRequirements: [] as Array<{ id: string; hierarchyId: string }>,
      functionalRequirements: [] as Array<{ id: string; hierarchyId: string }>,
      epics: [] as Array<{ id: string; hierarchyId: string }>,
      tasks: [] as Array<{ id: string; hierarchyId: string }>,
    };

    // Step 1: Save Client Requirements
    logger.debug('Step 1: Saving client requirements');
    for (let i = 0; i < generated.clientRequirements.length; i++) {
      const cr = generated.clientRequirements[i];
      logger.debug(`Creating client requirement ${i + 1}`, { title: cr.title });

      const crDoc = await serverDatabases.createDocument(
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
      logger.debug(`Created CR: ${crDoc.$id}`);
    }

    // Step 2: Save Functional Requirements (with hierarchy)
    logger.debug('Step 2: Saving functional requirements');
    const frIdMap = new Map<string, string>();

    // First pass: Create top-level requirements
    const topLevelFRs = generated.functionalRequirements.filter((fr: any) => !fr.parentId);
    logger.debug(`Creating ${topLevelFRs.length} top-level FRs`);

    for (let i = 0; i < topLevelFRs.length; i++) {
      const fr = topLevelFRs[i];
      const hierarchyId = `REQ-${String(i + 1).padStart(2, '0')}`;
      logger.debug(`Creating FR ${hierarchyId}`, { title: fr.title });

      const frDoc = await serverDatabases.createDocument(
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

      const originalIndex = generated.functionalRequirements.indexOf(fr);
      frIdMap.set(`fr-${originalIndex}`, frDoc.$id);
      result.functionalRequirements.push({
        id: frDoc.$id,
        hierarchyId,
      });
      logger.debug(`Created FR: ${frDoc.$id} (${hierarchyId})`);
    }

    // Second pass: Create child requirements
    const childFRs = generated.functionalRequirements.filter((fr: any) => fr.parentId);
    logger.debug(`Creating ${childFRs.length} child FRs`);

    for (const fr of childFRs) {
      const parentDbId = frIdMap.get(fr.parentId || '');
      if (!parentDbId) {
        logger.warn(`Skipping child FR (parent not found)`, { title: fr.title });
        continue;
      }

      const parent = await serverDatabases.getDocument(
        DATABASE_ID,
        FUNCTIONAL_REQUIREMENTS_COLLECTION_ID,
        parentDbId
      );

      const parentHierarchyId = parent.hierarchyId;
      const siblingCount = result.functionalRequirements.filter(
        (r) => r.hierarchyId.startsWith(parentHierarchyId + '.')
      ).length;
      const childHierarchyId = `${parentHierarchyId}.${String(siblingCount + 1).padStart(2, '0')}`;

      logger.debug(`Creating child FR ${childHierarchyId}`, { title: fr.title });

      const frDoc = await serverDatabases.createDocument(
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
      logger.debug(`Created child FR: ${frDoc.$id} (${childHierarchyId})`);
    }

    // Step 3: Save Epics
    logger.debug('Step 3: Saving epics');
    for (let i = 0; i < generated.epics.length; i++) {
      const epic = generated.epics[i];
      const epicHierarchyId = `${projectCode}-EPIC-${String(i + 1).padStart(2, '0')}`;
      logger.debug(`Creating epic ${epicHierarchyId}`, { name: epic.name });

      const linkedFRId =
        epic.functionalRequirementIds && epic.functionalRequirementIds.length > 0
          ? result.functionalRequirements[0]?.id || ''
          : '';

      const epicDoc = await serverDatabases.createDocument(
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
      logger.debug(`Created epic: ${epicDoc.$id} (${epicHierarchyId})`);
    }

    // Step 4: Save Tasks
    logger.debug('Step 4: Saving tasks');
    for (let i = 0; i < generated.tasks.length; i++) {
      const task = generated.tasks[i];
      const taskHierarchyId = `${projectCode}-${String(i + 1).padStart(3, '0')}`;
      logger.debug(`Creating task ${taskHierarchyId}`, { title: task.title });

      // Parse epicId as index if it's a string number
      let epicDbId = '';
      if (task.epicId) {
        const epicIndex = parseInt(task.epicId);
        if (!isNaN(epicIndex) && epicIndex < result.epics.length) {
          epicDbId = result.epics[epicIndex]?.id || '';
        }
      }

      const taskDoc = await serverDatabases.createDocument(
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
      logger.debug(`Created task: ${taskDoc.$id} (${taskHierarchyId})`);
    }

    logger.info('Bulk save complete', result);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('Bulk save error', { error: errorMessage, stack: errorStack });
    return NextResponse.json(
      { error: 'Failed to save generated data: ' + errorMessage },
      { status: 500 }
    );
  }
}
