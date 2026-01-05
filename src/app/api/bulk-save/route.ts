import { NextRequest, NextResponse } from 'next/server';
import { serverDatabases } from '@/lib/appwrite-server';
import { ID, Query } from 'node-appwrite';
import { logger } from '@/lib/logger';

// Helper to extract first N alphabetic characters from a string
function extractChars(text: string, count: number): string {
  if (!text) return '';
  const cleaned = text.replace(/[^a-zA-Z]/g, '');
  return cleaned.slice(0, count).toUpperCase();
}

// Helper to check if a hierarchyId already exists in a collection for a project
async function hierarchyIdExists(
  collectionId: string,
  projectId: string,
  hierarchyId: string
): Promise<boolean> {
  try {
    const existing = await serverDatabases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      collectionId,
      [Query.equal('projectId', projectId), Query.equal('hierarchyId', hierarchyId), Query.limit(1)]
    );
    return existing.total > 0;
  } catch {
    return false;
  }
}

// Type for generated functional requirement from AI
interface GeneratedFR {
  title: string;
  description: string;
  type: string;
  priority: string;
  complexity: string;
  acceptanceCriteria?: string[];
  businessRules?: string[];
  parentId?: string;
}

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const CLIENT_REQUIREMENTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_CLIENT_REQUIREMENTS_COLLECTION_ID!;
const FUNCTIONAL_REQUIREMENTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_REQUIREMENTS_COLLECTION_ID!;
const EPICS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_EPICS_COLLECTION_ID!;
const TASKS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!;

// Helper to determine FR type - TECHNICAL for code/implementation FRs, FUNCTIONAL for others
function determineFRType(fr: GeneratedFR): 'FUNCTIONAL' | 'TECHNICAL' {
  const technicalKeywords = [
    'api',
    'database',
    'code',
    'implementation',
    'backend',
    'frontend',
    'server',
    'endpoint',
    'query',
    'schema',
    'migration',
    'deploy',
    'infrastructure',
    'architecture',
    'integration',
    'service',
    'microservice',
    'rest',
    'graphql',
    'websocket',
    'authentication',
    'authorization',
    'encryption',
    'security',
    'cache',
    'performance',
    'optimization',
  ];

  const titleLower = fr.title.toLowerCase();
  const descLower = (fr.description || '').toLowerCase();
  const combinedText = `${titleLower} ${descLower}`;

  // Check if AI already marked it as TECHNICAL
  if (fr.type === 'TECHNICAL') return 'TECHNICAL';

  // Check for technical keywords
  const isTechnical = technicalKeywords.some((keyword) => combinedText.includes(keyword));

  return isTechnical ? 'TECHNICAL' : 'FUNCTIONAL';
}

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

    // Fetch the project to get the clientName
    const PROJECTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECTS_COLLECTION_ID!;
    const project = await serverDatabases.getDocument(
      DATABASE_ID,
      PROJECTS_COLLECTION_ID,
      projectId
    );
    const projectClientName = project.clientName || 'Client';

    // ============================================================
    // HIERARCHY: Client Requirement > Epic > FR > Task
    // ============================================================

    // Step 1: Save Client Requirements FIRST
    logger.debug('Step 1: Saving client requirements');
    for (let i = 0; i < generated.clientRequirements.length; i++) {
      const cr = generated.clientRequirements[i];
      logger.debug(`Creating client requirement ${i + 1}`, { title: cr.title });

      // Generate hierarchyId: {ProjectCode}-{CRCode}-{Number}
      // Example: PTES-RAU-01
      const crCode = extractChars(cr.title, 3);
      const crHierarchyId = `${projectCode}-${crCode}-${String(i + 1).padStart(2, '0')}`;

      const crDoc = await serverDatabases.createDocument(
        DATABASE_ID,
        CLIENT_REQUIREMENTS_COLLECTION_ID,
        ID.unique(),
        {
          workspaceId,
          projectId,
          title: cr.title,
          clientName: projectClientName, // Use client name from project
          description: cr.description,
          priority: cr.priority,
          status: 'DRAFT', // Client requirements use DRAFT status
          attachments: JSON.stringify([]),
          createdBy: userId,
        }
      );
      result.clientRequirements.push({
        id: crDoc.$id,
        hierarchyId: crHierarchyId, // Keep for linking to epics
      });
      logger.debug(`Created CR: ${crDoc.$id}`);
    }

    // Step 2: Save Epics SECOND (linked to Client Requirements)
    logger.debug('Step 2: Saving epics (linked to client requirements)');

    // Query existing epics in this project to get the next sequence number
    const existingEpics = await serverDatabases.listDocuments(DATABASE_ID, EPICS_COLLECTION_ID, [
      Query.equal('projectId', projectId),
    ]);
    const epicSequenceStart = existingEpics.total + 1;

    for (let i = 0; i < generated.epics.length; i++) {
      const epic = generated.epics[i];
      // Link epic to client requirement (first one or based on mapping)
      const linkedClientReqIndex = i % Math.max(result.clientRequirements.length, 1);
      const linkedClientReq = result.clientRequirements[linkedClientReqIndex];
      const linkedClientReqId = linkedClientReq?.id || '';

      // Get CR code from linked CR's hierarchyId (e.g., "PTES-RAU-01" -> "RAU")
      const crCode = linkedClientReq?.hierarchyId?.split('-')[1] || 'CR';

      // Generate epic hierarchy ID: {ProjectCode}-{CRCode}-{EpicCode}-{Number}
      // Example: PTES-RAU-EAU-01
      const epicCode = extractChars(epic.name, 3);
      const epicHierarchyId = `${projectCode}-${crCode}-${epicCode}-${String(epicSequenceStart + i).padStart(2, '0')}`;

      // Check if this hierarchyId already exists - skip if so
      if (await hierarchyIdExists(EPICS_COLLECTION_ID, projectId, epicHierarchyId)) {
        logger.warn(`Skipping epic (hierarchyId exists): ${epicHierarchyId}`, { name: epic.name });
        continue;
      }

      logger.debug(`Creating epic ${epicHierarchyId}`, { name: epic.name });

      const epicDoc = await serverDatabases.createDocument(
        DATABASE_ID,
        EPICS_COLLECTION_ID,
        ID.unique(),
        {
          workspaceId,
          projectId,
          hierarchyId: epicHierarchyId,
          requirementId: linkedClientReqId, // Link to parent Client Requirement
          name: epic.name,
          description: epic.description || '',
          color: epic.color || '#3b82f6',
          startDate: epic.startDate || '',
          endDate: epic.endDate || '',
          status: 'TODO', // Valid epic status
          progress: 0,
          createdBy: userId,
        }
      );

      result.epics.push({
        id: epicDoc.$id,
        hierarchyId: epicHierarchyId,
        crCode, // Store for FR linking
        requirementId: linkedClientReqId, // ✅ Store CR ID for FR linking
      } as { id: string; hierarchyId: string; crCode?: string; requirementId?: string });
      logger.debug(
        `Created epic: ${epicDoc.$id} (${epicHierarchyId}) linked to CR: ${linkedClientReqId}`
      );
    }

    // Step 3: Save Functional Requirements THIRD (linked to Epics)
    logger.debug('Step 3: Saving functional requirements (linked to epics)');
    const frIdMap = new Map<string, string>();

    // Query existing FRs in this project to get the next sequence number
    const existingFRs = await serverDatabases.listDocuments(
      DATABASE_ID,
      FUNCTIONAL_REQUIREMENTS_COLLECTION_ID,
      [Query.equal('projectId', projectId)]
    );
    const frSequenceStart = existingFRs.total + 1;

    // First pass: Create top-level requirements
    const topLevelFRs = generated.functionalRequirements.filter((fr: GeneratedFR) => !fr.parentId);
    logger.debug(`Creating ${topLevelFRs.length} top-level FRs`);

    for (let i = 0; i < topLevelFRs.length; i++) {
      const fr = topLevelFRs[i];

      // Link FR to epic (distribute FRs across epics, or use first epic)
      const epicIndex = result.epics.length > 0 ? i % result.epics.length : -1;
      const linkedEpic =
        epicIndex >= 0
          ? (result.epics[epicIndex] as {
              id: string;
              hierarchyId: string;
              crCode?: string;
              requirementId?: string;
            })
          : null;
      const linkedEpicId = linkedEpic?.id || '';
      // ✅ FIX: Get client requirement ID from the linked epic (not always first one)
      const linkedClientReqId = linkedEpic?.requirementId || result.clientRequirements[0]?.id || '';

      // Get CR and Epic codes from linked epic's hierarchyId
      // Epic hierarchyId format: "PTES-RAU-EAU-01" -> crCode="RAU", epicCode="EAU"
      const epicHierarchyParts = linkedEpic?.hierarchyId?.split('-') || [];
      const crCode = epicHierarchyParts[1] || 'CR';
      const epicCode = epicHierarchyParts[2] || 'EP';
      const frCode = extractChars(fr.title, 3);

      // Generate FR hierarchy ID: {ProjectCode}-{CRCode}-{EpicCode}-{FRCode}-{Number}
      // Example: PTES-RAU-EAU-FRL-01
      const hierarchyId = `${projectCode}-${crCode}-${epicCode}-${frCode}-${String(frSequenceStart + i).padStart(2, '0')}`;

      // Check if this hierarchyId already exists - skip if so
      if (await hierarchyIdExists(FUNCTIONAL_REQUIREMENTS_COLLECTION_ID, projectId, hierarchyId)) {
        logger.warn(`Skipping FR (hierarchyId exists): ${hierarchyId}`, { title: fr.title });
        continue;
      }

      logger.debug(`Creating FR ${hierarchyId}`, { title: fr.title });

      const frDoc = await serverDatabases.createDocument(
        DATABASE_ID,
        FUNCTIONAL_REQUIREMENTS_COLLECTION_ID,
        ID.unique(),
        {
          workspaceId,
          projectId,
          hierarchyId,
          epicId: linkedEpicId, // Link to parent Epic
          clientRequirementId: linkedClientReqId, // Also keep reference to Client Requirement
          title: fr.title,
          description: fr.description,
          complexity: fr.complexity,
          type: fr.type || determineFRType(fr),
          status: 'DRAFT', // Use valid FR status
          reusable: false,
          tags: '',
          linkedProjectIds: '',
          createdBy: userId,
        }
      );

      const originalIndex = generated.functionalRequirements.indexOf(fr);
      frIdMap.set(`fr-${originalIndex}`, frDoc.$id);
      result.functionalRequirements.push({
        id: frDoc.$id,
        hierarchyId,
        epicId: linkedEpicId, // Store for task linking
      } as { id: string; hierarchyId: string; epicId?: string });
      logger.debug(`Created FR: ${frDoc.$id} (${hierarchyId}) linked to Epic: ${linkedEpicId}`);
    }

    // Second pass: Create child requirements
    const childFRs = generated.functionalRequirements.filter((fr: GeneratedFR) => fr.parentId);
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
      const siblingCount = result.functionalRequirements.filter((r) =>
        r.hierarchyId.startsWith(parentHierarchyId + '.')
      ).length;
      // Generate child FR hierarchy ID
      const childHierarchyId = `${parentHierarchyId}.${String(siblingCount + 1).padStart(2, '0')}`;

      // Check if this hierarchyId already exists - skip if so
      if (
        await hierarchyIdExists(FUNCTIONAL_REQUIREMENTS_COLLECTION_ID, projectId, childHierarchyId)
      ) {
        logger.warn(`Skipping child FR (hierarchyId exists): ${childHierarchyId}`, {
          title: fr.title,
        });
        continue;
      }

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
          title: fr.title,
          description: fr.description,
          type: determineFRType(fr), // FUNCTIONAL by default, TECHNICAL for code-related
          complexity: fr.complexity,
          status: 'DRAFT', // Use valid FR status
          reusable: false,
          tags: '',
          linkedProjectIds: '',
          createdBy: userId,
        }
      );

      result.functionalRequirements.push({
        id: frDoc.$id,
        hierarchyId: childHierarchyId,
      });
      logger.debug(`Created child FR: ${frDoc.$id} (${childHierarchyId})`);
    }

    // Step 4: Save Tasks LAST (linked to FRs and Epics)
    logger.debug('Step 4: Saving tasks (linked to FRs and epics)');

    // Query existing tasks in this project to get the next sequence number
    const existingTasks = await serverDatabases.listDocuments(DATABASE_ID, TASKS_COLLECTION_ID, [
      Query.equal('projectId', projectId),
    ]);
    const taskSequenceStart = existingTasks.total + 1;

    for (let i = 0; i < generated.tasks.length; i++) {
      const task = generated.tasks[i];

      // Link task to FR and Epic
      let linkedFRId = '';
      let linkedFRHierarchyId = '';
      let linkedEpicId = '';

      // First try to link via epicId from AI generation
      if (task.epicId !== undefined && task.epicId !== '') {
        const epicIndex = parseInt(task.epicId);
        if (!isNaN(epicIndex) && epicIndex >= 0 && epicIndex < result.epics.length) {
          linkedEpicId = result.epics[epicIndex]?.id || '';
          // Find an FR that belongs to this epic
          const frForEpic = (
            result.functionalRequirements as Array<{
              id: string;
              hierarchyId: string;
              epicId?: string;
            }>
          ).find((fr) => fr.epicId === linkedEpicId);
          if (frForEpic) {
            linkedFRId = frForEpic.id;
            linkedFRHierarchyId = frForEpic.hierarchyId;
          }
        }
      }

      // If no link found, distribute tasks across FRs
      if (!linkedFRId && result.functionalRequirements.length > 0) {
        const frIndex = i % result.functionalRequirements.length;
        const fr = result.functionalRequirements[frIndex] as {
          id: string;
          hierarchyId: string;
          epicId?: string;
        };
        linkedFRId = fr.id;
        linkedFRHierarchyId = fr.hierarchyId;
        linkedEpicId = fr.epicId || linkedEpicId;
      }

      // If still no epic, use first epic
      if (!linkedEpicId && result.epics.length > 0) {
        linkedEpicId = result.epics[0]?.id || '';
      }

      // Generate task hierarchy ID: {FRHierarchyId}-{TaskCode}-{Number}
      // Example: PTES-RAU-EAU-FRL-01-LOG-01 (Task "Login" under FR)
      const taskCode = extractChars(task.title, 3);
      let taskHierarchyId: string;
      if (linkedFRHierarchyId) {
        taskHierarchyId = `${linkedFRHierarchyId}-${taskCode}-${String(taskSequenceStart + i).padStart(2, '0')}`;
      } else {
        // Fallback if no FR linked
        taskHierarchyId = `${projectCode}-${taskCode}-${String(taskSequenceStart + i).padStart(2, '0')}`;
      }

      // Check if this hierarchyId already exists - skip if so
      if (await hierarchyIdExists(TASKS_COLLECTION_ID, projectId, taskHierarchyId)) {
        logger.warn(`Skipping task (hierarchyId exists): ${taskHierarchyId}`, {
          title: task.title,
        });
        continue;
      }

      logger.debug(`Creating task ${taskHierarchyId}`, { title: task.title });

      const taskDoc = await serverDatabases.createDocument(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        ID.unique(),
        {
          workspaceId,
          projectId,
          hierarchyId: taskHierarchyId,
          title: task.title,
          description: task.description || '',
          status: 'BACKLOG', // Valid task status - pending approval
          priority: task.priority,
          assigneeIds: JSON.stringify([]),
          createdBy: userId,
          dueDate: '',
          estimatedHours: task.estimatedHours || 0,
          actualHours: 0,
          sprintId: '',
          epicId: linkedEpicId, // Link to parent Epic
          functionalRequirementId: linkedFRId, // Link to parent FR
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
      logger.debug(
        `Created task: ${taskDoc.$id} (${taskHierarchyId}) linked to Epic: ${linkedEpicId}, FR: ${linkedFRId}`
      );
    }

    logger.info('Bulk save complete', result);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('Bulk save error', { error: errorMessage, stack: errorStack });
    return NextResponse.json(
      { error: 'Failed to save generated data: ' + errorMessage },
      { status: 500 }
    );
  }
}
