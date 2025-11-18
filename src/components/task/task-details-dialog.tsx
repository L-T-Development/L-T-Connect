'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, User, Edit, Trash2, Tag, MessageSquare } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import type { Task } from '@/types';
import { CommentSection } from '@/components/comments/comment-section';
import { TaskDependencies } from '@/components/tasks/task-dependencies';
import { TaskTimeTracking } from '@/components/time-tracking/task-time-tracking';
import { useTasks, useAddTaskDependency, useRemoveTaskDependency } from '@/hooks/use-task';
import { useAuth } from '@/components/providers/auth-provider';
import { useWorkspace } from '@/hooks/use-workspace';

// Helper function to parse label format "color:text"
const parseLabel = (label: string) => {
  const parts = label.split(':');
  if (parts.length === 2) {
    return { color: parts[0], text: parts[1] };
  }
  return { color: 'gray', text: label };
};

// Color mapping for label backgrounds
const labelColorMap: Record<string, string> = {
  red: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  orange: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  green: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  pink: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
  gray: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
};

interface TaskDetailsDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

const statusConfig = {
  BACKLOG: { label: 'Backlog', color: 'bg-gray-500' },
  TODO: { label: 'To Do', color: 'bg-blue-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-500' },
  REVIEW: { label: 'Review', color: 'bg-purple-500' },
  DONE: { label: 'Done', color: 'bg-green-500' },
};

const priorityConfig = {
  LOW: { label: 'Low', color: 'text-green-500' },
  MEDIUM: { label: 'Medium', color: 'text-yellow-500' },
  HIGH: { label: 'High', color: 'text-orange-500' },
  CRITICAL: { label: 'Critical', color: 'text-red-500' },
};

export function TaskDetailsDialog({
  task,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: TaskDetailsDialogProps) {
  // Fetch all tasks from the same project for dependencies
  const { data: allTasks = [] } = useTasks(task?.projectId);
  const addDependency = useAddTaskDependency();
  const removeDependency = useRemoveTaskDependency();

  // Get user info for time tracking
  const { user } = useAuth();
  const { data: workspace } = useWorkspace();

  if (!task) return null;

  const status = statusConfig[task.status as keyof typeof statusConfig];
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig];
  const labels = task.labels && Array.isArray(task.labels) ? task.labels : [];

  // Handlers for dependency management (currently disabled)
  const handleAddDependency = async () => {
    await addDependency.mutateAsync();
  };

  const handleRemoveDependency = async () => {
    await removeDependency.mutateAsync();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {task.hierarchyId}
                </Badge>
                <Badge className={status.color}>{status.label}</Badge>
                <div className="flex items-center gap-1">
                  <span className={`text-lg ${priority.color}`}>●</span>
                  <span className="text-sm text-muted-foreground">{priority.label}</span>
                </div>
              </div>
              <DialogTitle className="text-2xl">{task.title}</DialogTitle>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(task)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(task.$id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Description */}
          <div>
            <h3 className="text-sm font-medium mb-2">Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {task.description || 'No description provided'}
            </p>
          </div>

          <Separator />

          {/* Task Details Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Due Date */}
            {task.dueDate && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Calendar className="h-4 w-4" />
                  Due Date
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(task.dueDate)}
                </p>
              </div>
            )}

            {/* Estimated Hours */}
            {task.estimatedHours && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Clock className="h-4 w-4" />
                  Estimated Hours
                </div>
                <p className="text-sm text-muted-foreground">
                  {task.estimatedHours}h
                </p>
              </div>
            )}

            {/* Created Date */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Calendar className="h-4 w-4" />
                Created
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(task.$createdAt)}
              </p>
            </div>

            {/* Updated Date */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Calendar className="h-4 w-4" />
                Last Updated
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(task.$updatedAt)}
              </p>
            </div>
          </div>

          {/* Labels */}
          {labels.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Tag className="h-4 w-4" />
                  Labels
                </div>
                <div className="flex flex-wrap gap-2">
                  {labels.map((label, index) => {
                    const { color, text } = parseLabel(label);
                    return (
                      <Badge 
                        key={index} 
                        variant="outline"
                        className={cn(
                          "border",
                          labelColorMap[color] || labelColorMap.gray
                        )}
                      >
                        {text}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Assignees */}
          {task.assigneeIds && Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <User className="h-4 w-4" />
                  Assignees
                </div>
                <p className="text-sm text-muted-foreground">
                  {task.assigneeIds.length} team member(s) assigned
                </p>
              </div>
            </>
          )}

          {/* Parent Task */}
          {task.parentTaskId && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-2">Parent Task</h3>
                <Badge variant="outline" className="font-mono">
                  {task.parentTaskId}
                </Badge>
              </div>
            </>
          )}

          {/* Task Dependencies */}
          <Separator />
          <TaskDependencies 
            task={task} 
            allTasks={allTasks}
            onAddDependency={handleAddDependency}
            onRemoveDependency={handleRemoveDependency}
          />

          {/* Time Tracking */}
          {user && workspace && (
            <>
              <Separator />
              <TaskTimeTracking
                task={task}
                userId={user.$id}
                userName={user.name || 'User'}
                userEmail={user.email}
                workspaceId={workspace.$id}
              />
            </>
          )}

          {/* Comments Section */}
          <Separator />
          <div>
            <div className="flex items-center gap-2 text-sm font-medium mb-4">
              <MessageSquare className="h-4 w-4" />
              Comments
            </div>
            <CommentSection entityId={task.$id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
