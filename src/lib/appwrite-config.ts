// Appwrite Collection IDs
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const STORAGE_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_ID!;

// Collections
export const COLLECTIONS = {
  WORKSPACES: 'workspaces',
  USERS: 'users',
  PROJECTS: 'projects',
  CLIENT_REQUIREMENTS: 'client_requirements',
  FUNCTIONAL_REQUIREMENTS: 'functional_requirements',
  EPICS: 'epics',
  SPRINTS: 'sprints',
  TASKS: 'tasks',
  TASK_COMMENTS: 'task_comments',
  KANBAN_COLUMNS: 'kanban_columns',
  LABELS: 'labels',
  ATTENDANCE: 'attendance',
  LEAVE_REQUESTS: 'leave_requests',
  LEAVE_BALANCES: 'leave_balances',
  NOTIFICATIONS: 'notifications',
  GITHUB_INTEGRATIONS: 'github_integrations',
  GITLAB_INTEGRATIONS: 'gitlab_integrations',
  DISCORD_INTEGRATIONS: 'discord_integrations',
  GIT_COMMITS: 'git_commits',
  ACTIVITY_LOGS: 'activity_logs',
} as const;

// Appwrite Setup Script
export const APPWRITE_COLLECTIONS_SCHEMA = [
  {
    name: COLLECTIONS.WORKSPACES,
    attributes: [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'description', type: 'string', size: 1000, required: false },
      { key: 'logo', type: 'string', size: 500, required: false },
      { key: 'color', type: 'string', size: 50, required: false },
      { key: 'ownerId', type: 'string', size: 50, required: true },
      { key: 'inviteCode', type: 'string', size: 20, required: true },
      { key: 'settings', type: 'string', size: 5000, required: true }, // JSON
    ],
    indexes: [
      { key: 'inviteCode', type: 'unique', attributes: ['inviteCode'] },
      { key: 'ownerId', type: 'key', attributes: ['ownerId'] },
    ],
  },
  {
    name: COLLECTIONS.USERS,
    attributes: [
      { key: 'email', type: 'string', size: 255, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'phone', type: 'string', size: 50, required: false },
      { key: 'avatar', type: 'string', size: 500, required: false },
      { key: 'role', type: 'string', size: 50, required: true },
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'status', type: 'string', size: 20, required: true },
    ],
    indexes: [
      { key: 'email', type: 'unique', attributes: ['email'] },
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
    ],
  },
  {
    name: COLLECTIONS.PROJECTS,
    attributes: [
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'shortCode', type: 'string', size: 10, required: true },
      { key: 'description', type: 'string', size: 5000, required: false },
      { key: 'logo', type: 'string', size: 500, required: false },
      { key: 'color', type: 'string', size: 50, required: false },
      { key: 'methodology', type: 'string', size: 20, required: true },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'startDate', type: 'string', size: 50, required: false },
      { key: 'endDate', type: 'string', size: 50, required: false },
      { key: 'ownerId', type: 'string', size: 50, required: true },
      { key: 'memberIds', type: 'string', size: 10000, required: true }, // JSON array
      { key: 'settings', type: 'string', size: 5000, required: true }, // JSON
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'shortCode', type: 'key', attributes: ['shortCode'] },
    ],
  },
  {
    name: COLLECTIONS.CLIENT_REQUIREMENTS,
    attributes: [
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'projectId', type: 'string', size: 50, required: true },
      { key: 'title', type: 'string', size: 500, required: true },
      { key: 'description', type: 'string', size: 10000, required: true },
      { key: 'clientName', type: 'string', size: 255, required: true },
      { key: 'priority', type: 'string', size: 20, required: true },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'attachments', type: 'string', size: 10000, required: false }, // JSON array
      { key: 'createdBy', type: 'string', size: 50, required: true },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'projectId', type: 'key', attributes: ['projectId'] },
    ],
  },
  {
    name: COLLECTIONS.FUNCTIONAL_REQUIREMENTS,
    attributes: [
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'projectId', type: 'string', size: 50, required: true },
      { key: 'hierarchyId', type: 'string', size: 50, required: true },
      { key: 'clientRequirementId', type: 'string', size: 50, required: false },
      { key: 'title', type: 'string', size: 500, required: true },
      { key: 'description', type: 'string', size: 10000, required: true },
      { key: 'complexity', type: 'string', size: 20, required: true },
      { key: 'reusable', type: 'boolean', required: true },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'linkedProjectIds', type: 'string', size: 5000, required: false }, // JSON array
      { key: 'tags', type: 'string', size: 2000, required: false }, // JSON array
      { key: 'createdBy', type: 'string', size: 50, required: true },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'projectId', type: 'key', attributes: ['projectId'] },
      { key: 'hierarchyId', type: 'unique', attributes: ['hierarchyId', 'projectId'] },
    ],
  },
  {
    name: COLLECTIONS.TASKS,
    attributes: [
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'projectId', type: 'string', size: 50, required: true },
      { key: 'hierarchyId', type: 'string', size: 50, required: true },
      { key: 'sprintId', type: 'string', size: 50, required: false },
      { key: 'epicId', type: 'string', size: 50, required: false },
      { key: 'parentTaskId', type: 'string', size: 50, required: false },
      { key: 'title', type: 'string', size: 500, required: true },
      { key: 'description', type: 'string', size: 10000, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'priority', type: 'string', size: 20, required: true },
      { key: 'assigneeIds', type: 'string', size: 5000, required: false }, // JSON array
      { key: 'createdBy', type: 'string', size: 50, required: true },
      { key: 'dueDate', type: 'string', size: 50, required: false },
      { key: 'estimatedHours', type: 'integer', required: false },
      { key: 'actualHours', type: 'integer', required: false },
      { key: 'labels', type: 'string', size: 2000, required: false }, // JSON array
      { key: 'attachments', type: 'string', size: 10000, required: false }, // JSON array
      { key: 'customFields', type: 'string', size: 10000, required: false }, // JSON
      { key: 'position', type: 'integer', required: true },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'projectId', type: 'key', attributes: ['projectId'] },
      { key: 'hierarchyId', type: 'unique', attributes: ['hierarchyId', 'projectId'] },
      { key: 'sprintId', type: 'key', attributes: ['sprintId'] },
      { key: 'status', type: 'key', attributes: ['status'] },
    ],
  },
  {
    name: COLLECTIONS.ATTENDANCE,
    attributes: [
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'userId', type: 'string', size: 50, required: true },
      { key: 'date', type: 'string', size: 20, required: true },
      { key: 'checkInTime', type: 'string', size: 50, required: true }, // Changed from checkIn
      { key: 'checkOutTime', type: 'string', size: 50, required: false }, // Changed from checkOut
      { key: 'workHours', type: 'double', required: false }, // Changed from workingHours, changed to double for decimals
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'lateMinutes', type: 'integer', required: false }, // Added
      { key: 'location', type: 'string', size: 500, required: false }, // Added
      { key: 'notes', type: 'string', size: 1000, required: false },
      { key: 'isWeekend', type: 'boolean', required: false }, // Added
      { key: 'isHoliday', type: 'boolean', required: false }, // Added
      { key: 'createdBy', type: 'string', size: 50, required: false }, // Added for audit
      { key: 'createdByName', type: 'string', size: 255, required: false }, // Added for audit
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'userId', type: 'key', attributes: ['userId'] },
      { key: 'date', type: 'key', attributes: ['date'] },
      { key: 'userId_date', type: 'unique', attributes: ['userId', 'date'] },
    ],
  },
  {
    name: COLLECTIONS.LEAVE_REQUESTS,
    attributes: [
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'userId', type: 'string', size: 50, required: true },
      { key: 'type', type: 'string', size: 20, required: true },
      { key: 'startDate', type: 'string', size: 20, required: true },
      { key: 'endDate', type: 'string', size: 20, required: true },
      { key: 'reason', type: 'string', size: 2000, required: true },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'approvedBy', type: 'string', size: 50, required: false },
      { key: 'approvedAt', type: 'string', size: 50, required: false },
      { key: 'rejectionReason', type: 'string', size: 1000, required: false },
      { key: 'daysCount', type: 'integer', required: true },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'userId', type: 'key', attributes: ['userId'] },
      { key: 'status', type: 'key', attributes: ['status'] },
    ],
  },
  {
    name: COLLECTIONS.NOTIFICATIONS,
    attributes: [
      { key: 'workspaceId', type: 'string', size: 50, required: true },
      { key: 'userId', type: 'string', size: 50, required: true },
      { key: 'type', type: 'string', size: 50, required: true },
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'message', type: 'string', size: 1000, required: true },
      { key: 'relatedEntityId', type: 'string', size: 50, required: false },
      { key: 'relatedEntityType', type: 'string', size: 50, required: false },
      { key: 'isRead', type: 'boolean', required: true },
      { key: 'actionUrl', type: 'string', size: 500, required: false },
    ],
    indexes: [
      { key: 'workspaceId', type: 'key', attributes: ['workspaceId'] },
      { key: 'userId', type: 'key', attributes: ['userId'] },
      { key: 'isRead', type: 'key', attributes: ['isRead'] },
    ],
  },
];
