/**
 * Deadline Reminder Service
 * Checks for upcoming task deadlines and sends notifications
 */

import { databases } from '@/lib/appwrite-client';
import { Query } from 'appwrite';
import { createBulkNotifications } from '@/hooks/use-notification';
import type { Task } from '@/types';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const TASKS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!;
const PROJECTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECTS_COLLECTION_ID!;

// Store last check time to avoid duplicate notifications
const STORAGE_KEY = 'deadline_reminder_last_check';

interface DeadlineReminderConfig {
  workspaceId: string;
  daysBeforeDeadline?: number[]; // e.g., [1, 3, 7] for reminders at 1, 3, and 7 days before
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculate days remaining until deadline
 */
function getDaysRemaining(dueDate: string): number {
  const now = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Check if we should send a reminder for this day count
 */
function shouldSendReminder(daysRemaining: number, reminderDays: number[]): boolean {
  return reminderDays.includes(daysRemaining);
}

/**
 * Check for tasks with upcoming deadlines and send reminders
 */
export async function checkDeadlineReminders(
  config: DeadlineReminderConfig
): Promise<{ sent: number; tasks: string[] }> {
  const { workspaceId, daysBeforeDeadline = [1, 3, 7] } = config;

  // Check if we've already run today
  const lastCheck = localStorage.getItem(STORAGE_KEY);
  const today = new Date().toDateString();

  if (lastCheck === today) {
    return { sent: 0, tasks: [] };
  }

  try {
    // Get all tasks with due dates that are not completed
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + Math.max(...daysBeforeDeadline) + 1);

    const response = await databases.listDocuments(DATABASE_ID, TASKS_COLLECTION_ID, [
      Query.equal('workspaceId', workspaceId),
      Query.notEqual('status', 'DONE'),
      Query.greaterThanEqual('dueDate', now.toISOString()),
      Query.lessThanEqual('dueDate', maxDate.toISOString()),
      Query.limit(100),
    ]);

    const tasks = response.documents as unknown as Task[];
    const notificationsSent: string[] = [];

    // Process each task
    for (const task of tasks) {
      if (!task.dueDate) continue;

      const daysRemaining = getDaysRemaining(task.dueDate);

      // Skip if not a reminder day
      if (!shouldSendReminder(daysRemaining, daysBeforeDeadline)) continue;

      // Get assignees to notify
      const assignees = Array.isArray(task.assignedTo)
        ? task.assignedTo
        : typeof task.assignedTo === 'string'
          ? [task.assignedTo]
          : [];

      const validAssignees = assignees.filter(
        (id: string) => id && typeof id === 'string' && id.trim() !== ''
      );

      if (validAssignees.length === 0) continue;

      // Get project name
      let projectName = 'Project';
      try {
        const project = await databases.getDocument(
          DATABASE_ID,
          PROJECTS_COLLECTION_ID,
          task.projectId
        );
        projectName = project.name || 'Project';
      } catch (error) {
        console.error('Failed to get project name:', error);
      }

      // Send deadline reminder notification
      try {
        await createBulkNotifications({
          workspaceId,
          userIds: validAssignees,
          type: 'TASK_DEADLINE_REMINDER',
          data: {
            taskId: task.$id,
            taskTitle: task.title,
            taskHierarchyId: task.hierarchyId,
            projectId: task.projectId,
            projectName,
            dueDate: formatDate(new Date(task.dueDate)),
            daysRemaining,
            entityType: 'TASK',
          },
        });

        notificationsSent.push(task.title);
      } catch (error) {
        console.error(`Failed to send deadline reminder for task ${task.$id}:`, error);
      }
    }

    // Also check for overdue tasks
    const overdueResponse = await databases.listDocuments(DATABASE_ID, TASKS_COLLECTION_ID, [
      Query.equal('workspaceId', workspaceId),
      Query.notEqual('status', 'DONE'),
      Query.lessThan('dueDate', now.toISOString()),
      Query.limit(50),
    ]);

    const overdueTasks = overdueResponse.documents as unknown as Task[];

    for (const task of overdueTasks) {
      if (!task.dueDate) continue;

      const daysOverdue = Math.abs(getDaysRemaining(task.dueDate));

      // Only send overdue reminders for tasks 1-7 days overdue (not spam old ones)
      if (daysOverdue > 7) continue;

      const assignees = Array.isArray(task.assignedTo)
        ? task.assignedTo
        : typeof task.assignedTo === 'string'
          ? [task.assignedTo]
          : [];

      const validAssignees = assignees.filter(
        (id: string) => id && typeof id === 'string' && id.trim() !== ''
      );

      if (validAssignees.length === 0) continue;

      // Get project name
      let projectName = 'Project';
      try {
        const project = await databases.getDocument(
          DATABASE_ID,
          PROJECTS_COLLECTION_ID,
          task.projectId
        );
        projectName = project.name || 'Project';
      } catch (error) {
        console.error('Failed to get project name:', error);
      }

      try {
        await createBulkNotifications({
          workspaceId,
          userIds: validAssignees,
          type: 'TASK_OVERDUE',
          data: {
            taskId: task.$id,
            taskTitle: task.title,
            taskHierarchyId: task.hierarchyId,
            projectId: task.projectId,
            projectName,
            overdueBy: `${daysOverdue} day(s)`,
            entityType: 'TASK',
          },
        });

        notificationsSent.push(`${task.title} (overdue)`);
      } catch (error) {
        console.error(`Failed to send overdue notification for task ${task.$id}:`, error);
      }
    }

    // Update last check time
    localStorage.setItem(STORAGE_KEY, today);

    return { sent: notificationsSent.length, tasks: notificationsSent };
  } catch (error) {
    console.error('Failed to check deadline reminders:', error);
    return { sent: 0, tasks: [] };
  }
}

/**
 * Hook to use deadline reminder service
 * Call this in dashboard/layout to check for deadlines on load
 */
export function useDeadlineReminderCheck(workspaceId?: string) {
  if (typeof window === 'undefined' || !workspaceId) {
    return { checkReminders: async () => ({ sent: 0, tasks: [] }) };
  }

  const checkReminders = async () => {
    return checkDeadlineReminders({
      workspaceId,
      daysBeforeDeadline: [1, 3, 7], // Send reminders at 1, 3, and 7 days before deadline
    });
  };

  return { checkReminders };
}
