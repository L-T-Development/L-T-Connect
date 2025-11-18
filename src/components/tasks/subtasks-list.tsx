'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/use-task';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';

interface SubtasksListProps {
  parentTask: Task;
  subtasks: Task[];
  readonly?: boolean;
}

export function SubtasksList({ parentTask, subtasks, readonly = false }: SubtasksListProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const completedCount = subtasks.filter(st => st.status === 'DONE').length;
  const totalCount = subtasks.length;
  const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    try {
      // Generate hierarchyId for subtask (e.g., ABC-01.01 -> ABC-01.01.01)
      const existingSubtaskNumbers = subtasks
        .map(st => {
          const parts = st.hierarchyId.split('.');
          return parseInt(parts[parts.length - 1]) || 0;
        })
        .filter(n => !isNaN(n));

      const nextNumber = existingSubtaskNumbers.length > 0 
        ? Math.max(...existingSubtaskNumbers) + 1 
        : 1;

      const subtaskHierarchyId = `${parentTask.hierarchyId}.${String(nextNumber).padStart(2, '0')}`;

      await createTask.mutateAsync({
        workspaceId: parentTask.workspaceId,
        projectId: parentTask.projectId,
        hierarchyId: subtaskHierarchyId,
        parentTaskId: parentTask.$id,
        sprintId: parentTask.sprintId,
        title: newSubtaskTitle.trim(),
        description: '',
        status: 'TODO',
        priority: parentTask.priority,
        assigneeIds: [],
        watcherIds: [],
        createdBy: parentTask.createdBy,
        labels: [],
        attachments: [],
        customFields: {},
        position: subtasks.length,
        blockedBy: [],
        blocks: [],
      } as any);

      setNewSubtaskTitle('');
      setIsAdding(false);

      toast({
        title: 'Subtask created',
        description: 'The subtask has been added successfully.',
      });
    } catch (error) {
      console.error('Failed to create subtask:', error);
      toast({
        title: 'Error',
        description: 'Failed to create subtask. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleSubtask = async (subtask: Task) => {
    try {
      const newStatus = subtask.status === 'DONE' ? 'TODO' : 'DONE';
      await updateTask.mutateAsync({
        taskId: subtask.$id,
        projectId: subtask.projectId,
        updates: { status: newStatus },
      });
    } catch (error) {
      console.error('Failed to toggle subtask:', error);
      toast({
        title: 'Error',
        description: 'Failed to update subtask status.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSubtask = async (subtaskId: string, projectId: string) => {
    if (!confirm('Are you sure you want to delete this subtask?')) return;

    try {
      await deleteTask.mutateAsync({ taskId: subtaskId, projectId });
      toast({
        title: 'Subtask deleted',
        description: 'The subtask has been removed.',
      });
    } catch (error) {
      console.error('Failed to delete subtask:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete subtask.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-medium">Subtasks</h4>
          {totalCount > 0 && (
            <div className="flex items-center gap-2">
              <Progress value={completionRate} className="h-2 w-32" />
              <span className="text-xs text-muted-foreground">
                {completedCount}/{totalCount}
              </span>
            </div>
          )}
        </div>
        {!readonly && !isAdding && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Subtask
          </Button>
        )}
      </div>

      {/* Subtask List */}
      <div className="space-y-2">
        {subtasks.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No subtasks yet. Break down this task into smaller steps.
          </p>
        ) : (
          subtasks.map((subtask) => (
            <div
              key={subtask.$id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border bg-card transition-colors',
                subtask.status === 'DONE' && 'opacity-60'
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {!readonly && (
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move flex-shrink-0" />
                )}
                <Checkbox
                  checked={subtask.status === 'DONE'}
                  onCheckedChange={() => handleToggleSubtask(subtask)}
                  disabled={readonly}
                  className="mt-0.5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm',
                      subtask.status === 'DONE' && 'line-through text-muted-foreground'
                    )}
                  >
                    {subtask.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs font-mono">
                      {subtask.hierarchyId}
                    </Badge>
                    {subtask.status === 'DONE' && (
                      <Badge variant="outline" className="text-xs gap-1 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Done
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {!readonly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => handleDeleteSubtask(subtask.$id, subtask.projectId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))
        )}

        {/* Add Subtask Form */}
        {isAdding && (
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
            <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Subtask title..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSubtask();
                } else if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewSubtaskTitle('');
                }
              }}
              autoFocus
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleAddSubtask}
              disabled={!newSubtaskTitle.trim() || createTask.isPending}
            >
              Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewSubtaskTitle('');
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Subtask Progress Badge for parent task cards
interface SubtaskProgressBadgeProps {
  completed: number;
  total: number;
}

export function SubtaskProgressBadge({ completed, total }: SubtaskProgressBadgeProps) {
  if (total === 0) return null;

  const isComplete = completed === total;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'gap-1',
        isComplete 
          ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
          : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
      )}
    >
      {isComplete ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <Circle className="h-3 w-3" />
      )}
      {completed}/{total}
    </Badge>
  );
}
