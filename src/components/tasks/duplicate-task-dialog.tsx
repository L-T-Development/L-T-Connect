'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Copy, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreateTask } from '@/hooks/use-task';
import type { Task } from '@/types';

interface DuplicateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  onSuccess?: () => void;
}

export function DuplicateTaskDialog({
  open,
  onOpenChange,
  task,
  onSuccess,
}: DuplicateTaskDialogProps) {
  const { toast } = useToast();
  const createTask = useCreateTask();
  const [options, setOptions] = useState({
    includeAssignees: true,
    includeLabels: true,
    includeDependencies: false,
    includeAttachments: false,
    includeComments: false,
    includeSubtasks: false,
  });

  const handleToggle = (key: keyof typeof options) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDuplicate = async () => {
    try {
      // Generate new title and keep sprint
      const duplicateTitle = `${task.title} (Copy)`;
      const targetSprintId = task.sprintId;

      const duplicateData = {
        workspaceId: task.workspaceId,
        projectId: task.projectId,
        projectCode: task.hierarchyId.split('-')[0], // Extract project code
        title: duplicateTitle,
        description: task.description,
        status: 'TODO' as const,
        priority: task.priority,
        sprintId: targetSprintId || task.sprintId,
        epicId: task.epicId,
        functionalRequirementId: task.functionalRequirementId,
        assigneeIds: options.includeAssignees ? task.assigneeIds : [],
        labels: options.includeLabels ? task.labels : [],
        blockedBy: options.includeDependencies ? task.blockedBy : [],
        blocks: options.includeDependencies ? task.blocks : [],
        estimatedHours: task.estimatedHours,
        dueDate: task.dueDate,
        createdBy: task.createdBy,
      };

      await createTask.mutateAsync(duplicateData);

      toast({
        title: 'Task duplicated',
        description: 'The task has been successfully duplicated.',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to duplicate task:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate task. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Task
          </DialogTitle>
          <DialogDescription>
            Choose what to include in the duplicated task. The new task will be created with status "TODO".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="assignees"
                checked={options.includeAssignees}
                onCheckedChange={() => handleToggle('includeAssignees')}
              />
              <Label htmlFor="assignees" className="text-sm font-normal cursor-pointer">
                Include assignees ({task.assigneeIds.length})
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="labels"
                checked={options.includeLabels}
                onCheckedChange={() => handleToggle('includeLabels')}
              />
              <Label htmlFor="labels" className="text-sm font-normal cursor-pointer">
                Include labels ({task.labels.length})
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="dependencies"
                checked={options.includeDependencies}
                onCheckedChange={() => handleToggle('includeDependencies')}
              />
              <Label htmlFor="dependencies" className="text-sm font-normal cursor-pointer">
                Include dependencies ({task.blockedBy.length + task.blocks.length})
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="attachments"
                checked={options.includeAttachments}
                onCheckedChange={() => handleToggle('includeAttachments')}
              />
              <Label htmlFor="attachments" className="text-sm font-normal cursor-pointer">
                Include attachments ({task.attachments.length})
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="subtasks"
                checked={options.includeSubtasks}
                onCheckedChange={() => handleToggle('includeSubtasks')}
                disabled
              />
              <Label htmlFor="subtasks" className="text-sm font-normal cursor-pointer text-muted-foreground">
                Include subtasks (coming soon)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="comments"
                checked={options.includeComments}
                onCheckedChange={() => handleToggle('includeComments')}
                disabled
              />
              <Label htmlFor="comments" className="text-sm font-normal cursor-pointer text-muted-foreground">
                Include comments (coming soon)
              </Label>
            </div>
          </div>

          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Note:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Status will be reset to TODO</li>
              <li>Due date will not be copied</li>
              <li>Actual hours will be reset to 0</li>
              <li>Watchers will not be copied</li>
              <li>A new hierarchy ID will be generated</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDuplicate} 
            disabled={createTask.isPending}
            className="gap-2"
          >
            {createTask.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Duplicating...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Duplicate Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
