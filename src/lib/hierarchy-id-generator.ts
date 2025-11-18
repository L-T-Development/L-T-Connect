/**
 * Utility functions for generating hierarchical IDs
 * Format: PTE-RAU-EAU-FRL-SS1-TT1
 * 
 * Structure:
 * - P{ProjectCode} = Project prefix + first 2 chars of name
 * - R{RequirementCode} = Requirement prefix + first 2 chars of name
 * - E{EpicCode} = Epic prefix + first 2 chars of name
 * - FR{FRCode} = Functional Requirement prefix + first char of name
 * - S{SprintCode} = Sprint prefix + sprint name/number
 * - T{TaskCode} = Task prefix + task name/number
 */

/**
 * Extract first N alphabetic characters from a string
 */
function extractChars(text: string, count: number): string {
  if (!text) return '';
  // Remove special characters and numbers, take first N chars, uppercase
  const cleaned = text.replace(/[^a-zA-Z]/g, '');
  return cleaned.slice(0, count).toUpperCase();
}

/**
 * Generate project code from project name
 * Example: "Test Project" -> "TE"
 */
export function generateProjectCode(projectName: string): string {
  return extractChars(projectName, 2);
}

/**
 * Generate requirement hierarchical ID
 * Format: P{ProjectCode}-R{ReqCode}-{Number}
 * Example: "PTE-RAU-01"
 */
export function generateRequirementId(
  projectCode: string,
  projectName: string,
  requirementName: string,
  sequenceNumber: number
): string {
  const projCode = projectCode || extractChars(projectName, 2);
  const reqCode = extractChars(requirementName, 2);
  const seqNum = sequenceNumber.toString().padStart(2, '0');
  return `P${projCode}-R${reqCode}-${seqNum}`;
}

/**
 * Generate epic hierarchical ID
 * Format: P{ProjectCode}-R{ReqCode}-E{EpicCode}-{Number}
 * Example: "PTE-RAU-EAU-01"
 */
export function generateEpicId(
  projectCode: string,
  projectName: string,
  requirementName: string,
  epicName: string,
  sequenceNumber: number
): string {
  const projCode = projectCode || extractChars(projectName, 2);
  const reqCode = extractChars(requirementName, 2);
  const epicCode = extractChars(epicName, 2);
  const seqNum = sequenceNumber.toString().padStart(2, '0');
  return `P${projCode}-R${reqCode}-E${epicCode}-${seqNum}`;
}

/**
 * Generate epic hierarchical ID (when no requirement)
 * Format: P{ProjectCode}-E{EpicCode}-{Number}
 * Example: "PTE-EAU-01"
 */
export function generateEpicIdWithoutRequirement(
  projectCode: string,
  projectName: string,
  epicName: string,
  sequenceNumber: number
): string {
  const projCode = projectCode || extractChars(projectName, 2);
  const epicCode = extractChars(epicName, 2);
  const seqNum = sequenceNumber.toString().padStart(2, '0');
  return `P${projCode}-E${epicCode}-${seqNum}`;
}

/**
 * Generate functional requirement hierarchical ID
 * Format: P{ProjectCode}-R{ReqCode}-E{EpicCode}-FR{FRCode}-{Number}
 * Example: "PTE-RAU-EAU-FRL-01"
 */
export function generateFRId(
  projectCode: string,
  projectName: string,
  requirementName: string,
  epicName: string,
  frName: string,
  sequenceNumber: number
): string {
  const projCode = projectCode || extractChars(projectName, 2);
  const reqCode = extractChars(requirementName, 2);
  const epicCode = extractChars(epicName, 2);
  const frCode = extractChars(frName, 1);
  const seqNum = sequenceNumber.toString().padStart(2, '0');
  return `P${projCode}-R${reqCode}-E${epicCode}-FR${frCode}-${seqNum}`;
}

/**
 * Generate FR ID when only epic exists (no requirement)
 * Format: P{ProjectCode}-E{EpicCode}-FR{FRCode}-{Number}
 * Example: "PTE-EAU-FRL-01"
 */
export function generateFRIdWithEpicOnly(
  projectCode: string,
  projectName: string,
  epicName: string,
  frName: string,
  sequenceNumber: number
): string {
  const projCode = projectCode || extractChars(projectName, 2);
  const epicCode = extractChars(epicName, 2);
  const frCode = extractChars(frName, 1);
  const seqNum = sequenceNumber.toString().padStart(2, '0');
  return `P${projCode}-E${epicCode}-FR${frCode}-${seqNum}`;
}

/**
 * Generate FR ID when no epic or requirement
 * Format: P{ProjectCode}-FR{FRCode}-{Number}
 * Example: "PTE-FRL-01"
 */
export function generateFRIdStandalone(
  projectCode: string,
  projectName: string,
  frName: string,
  sequenceNumber: number
): string {
  const projCode = projectCode || extractChars(projectName, 2);
  const frCode = extractChars(frName, 1);
  const seqNum = sequenceNumber.toString().padStart(2, '0');
  return `P${projCode}-FR${frCode}-${seqNum}`;
}

/**
 * Generate task hierarchical ID
 * Format: {FRId}-S{SprintCode}-T{TaskCode}-{Number}
 * Example: "PTE-RAU-EAU-FRL-01-SS1-TT1"
 */
export function generateTaskId(
  frHierarchyId: string,
  sprintName: string,
  taskName: string,
  sequenceNumber: number
): string {
  const sprintCode = extractChars(sprintName, 2) || sprintName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();
  const taskCode = extractChars(taskName, 2) || sequenceNumber.toString();
  return `${frHierarchyId}-S${sprintCode}-T${taskCode}`;
}

/**
 * Generate task ID when no FR
 * Format: P{ProjectCode}-S{SprintCode}-T{TaskCode}-{Number}
 * Example: "PTE-SS1-TT1"
 */
export function generateTaskIdWithoutFR(
  projectCode: string,
  projectName: string,
  sprintName: string,
  taskName: string,
  sequenceNumber: number
): string {
  const projCode = projectCode || extractChars(projectName, 2);
  const sprintCode = extractChars(sprintName, 2) || sprintName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();
  const taskCode = extractChars(taskName, 2) || sequenceNumber.toString();
  return `P${projCode}-S${sprintCode}-T${taskCode}`;
}

/**
 * Generate sprint hierarchical ID
 * Format: P{ProjectCode}-S{SprintName}
 * Example: "PTE-S1" or "PTE-SSPRINT1"
 */
export function generateSprintId(
  projectCode: string,
  projectName: string,
  sprintName: string
): string {
  const projCode = projectCode || extractChars(projectName, 2);
  const sprintCode = sprintName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `P${projCode}-S${sprintCode}`;
}
