'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckSquare,
  Square,
  X,
  ListChecks,
  Flag,
  User,
  Trash2,
  Tag,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUpdateTask, useDeleteTask } from '@/hooks/use-task';
import type { Task, TaskStatus, TaskPriority } from '@/types';
import { cn } from '@/lib/utils';

interface BulkActionsToolbarProps {
  selectedTasks: Set<string>;
  allTasks: Task[];
  onClearSelection: () => void;
  onSelectAll: () => void;
  onRefresh?: () => void;
}

export function BulkActionsToolbar({
  selectedTasks,
  allTasks,
  onClearSelection,
  onSelectAll,
  onRefresh,
}: BulkActionsToolbarProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  const { toast } = useToast();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const selectedCount = selectedTasks.size;
  const totalCount = allTasks.length;
  const isAllSelected = selectedCount === totalCount && totalCount > 0;

  const handleBulkStatusChange = async (newStatus: TaskStatus) => {
    setCurrentAction('status');
    setIsProcessing(true);

    try {
      const tasks = allTasks.filter(t => selectedTasks.has(t.$id));
      
      for (const task of tasks) {
        await updateTask.mutateAsync({
          taskId: task.$id,
          projectId: task.projectId,
          updates: { status: newStatus },
        });
      }

      toast({
        title: 'Tasks updated',
        description: `${selectedCount} task(s) moved to ${newStatus}`,
      });

      onClearSelection();
      onRefresh?.();
    } catch (error) {
      console.error('Bulk status update failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to update some tasks',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setCurrentAction('');
    }
  };

  const handleBulkPriorityChange = async (newPriority: TaskPriority) => {
    setCurrentAction('priority');
    setIsProcessing(false);

    try {
      const tasks = allTasks.filter(t => selectedTasks.has(t.$id));
      
      for (const task of tasks) {
        await updateTask.mutateAsync({
          taskId: task.$id,
          projectId: task.projectId,
          updates: { priority: newPriority },
        });
      }

      toast({
        title: 'Tasks updated',
        description: `${selectedCount} task(s) priority changed to ${newPriority}`,
      });

      onClearSelection();
      onRefresh?.();
    } catch (error) {
      console.error('Bulk priority update failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to update some tasks',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setCurrentAction('');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCount} task(s)? This action cannot be undone.`)) {
      return;
    }

    setCurrentAction('delete');
    setIsProcessing(true);

    try {
      const tasks = allTasks.filter(t => selectedTasks.has(t.$id));
      
      for (const task of tasks) {
        await deleteTask.mutateAsync({
          taskId: task.$id,
          projectId: task.projectId,
        });
      }

      toast({
        title: 'Tasks deleted',
        description: `${selectedCount} task(s) have been deleted`,
      });

      onClearSelection();
      onRefresh?.();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete some tasks',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setCurrentAction('');
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-background border shadow-lg rounded-lg p-4 flex items-center gap-4 min-w-[600px]">
        {/* Selection Info */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={isAllSelected ? onClearSelection : onSelectAll}
          >
            {isAllSelected ? (
              <CheckSquare className="h-5 w-5" />
            ) : (
              <Square className="h-5 w-5" />
            )}
          </Button>
          <Badge variant="secondary" className="font-semibold">
            {selectedCount} selected
          </Badge>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Change Status */}
          <Select onValueChange={(value) => handleBulkStatusChange(value as TaskStatus)}>
            <SelectTrigger className="w-[140px] h-8">
              <ListChecks className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="REVIEW">Review</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
            </SelectContent>
          </Select>

          {/* Change Priority */}
          <Select onValueChange={(value) => handleBulkPriorityChange(value as TaskPriority)}>
            <SelectTrigger className="w-[140px] h-8">
              <Flag className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* Assign (placeholder - needs team members) */}
          <Button variant="outline" size="sm" className="h-8 gap-1" disabled>
            <User className="h-4 w-4" />
            Assign
          </Button>

          {/* Add Labels (placeholder) */}
          <Button variant="outline" size="sm" className="h-8 gap-1" disabled>
            <Tag className="h-4 w-4" />
            Labels
          </Button>

          <div className="h-6 w-px bg-border" />

          {/* Delete */}
          <Button
            variant="destructive"
            size="sm"
            className="h-8 gap-1"
            onClick={handleBulkDelete}
            disabled={isProcessing}
          >
            {isProcessing && currentAction === 'delete' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Clear Selection */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-auto"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Loading Overlay */}
        {isProcessing && currentAction !== 'delete' && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Processing...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Task Selection Checkbox
interface TaskSelectionCheckboxProps {
  taskId: string;
  isSelected: boolean;
  onToggle: (taskId: string) => void;
}

export function TaskSelectionCheckbox({
  taskId,
  isSelected,
  onToggle,
}: TaskSelectionCheckboxProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex items-center justify-center h-5 w-5 rounded border-2 transition-all',
        isSelected
          ? 'bg-primary border-primary text-primary-foreground'
          : 'border-muted-foreground/30 hover:border-muted-foreground'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(taskId);
      }}
    >
      {isSelected && <CheckSquare className="h-4 w-4" />}
    </button>
  );
}
