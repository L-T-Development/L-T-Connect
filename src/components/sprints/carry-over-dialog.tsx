'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, PackageOpen, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { databases } from '@/lib/appwrite-client';

interface Task {
  $id: string;
  title: string;
  status: string;
  hierarchyId: string;
  priority: string;
}

interface CarryOverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSprintName: string;
  nextSprintId?: string;
  nextSprintName?: string;
  incompleteTasks: Task[];
  onComplete: () => void;
}

export function CarryOverDialog({
  open,
  onOpenChange,
  currentSprintName,
  nextSprintId,
  nextSprintName,
  incompleteTasks,
  onComplete,
}: CarryOverDialogProps) {
  const { toast } = useToast();
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set(incompleteTasks.map(t => t.$id)));
  const [destination, setDestination] = useState<'next-sprint' | 'backlog'>(nextSprintId ? 'next-sprint' : 'backlog');
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleTask = (taskId: string) => {
    const newSelected = new Set(selectedTaskIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTaskIds(newSelected);
  };

  const selectAll = () => {
    setSelectedTaskIds(new Set(incompleteTasks.map(t => t.$id)));
  };

  const deselectAll = () => {
    setSelectedTaskIds(new Set());
  };

  const handleCarryOver = async () => {
    if (selectedTaskIds.size === 0) {
      toast({
        title: 'No tasks selected',
        description: 'Please select at least one task to carry over',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const tasksToMove = incompleteTasks.filter(t => selectedTaskIds.has(t.$id));
      
      // Update each task
      for (const task of tasksToMove) {
        const updates: any = {
          status: 'TODO', // Reset to TODO
        };

        if (destination === 'next-sprint' && nextSprintId) {
          updates.sprintId = nextSprintId;
        } else {
          // Move to backlog (remove sprint association)
          updates.sprintId = null;
        }

        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!,
          task.$id,
          updates
        );
      }

      toast({
        title: 'Tasks carried over',
        description: `${selectedTaskIds.size} task(s) moved to ${destination === 'next-sprint' ? nextSprintName : 'Backlog'}`,
      });

      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to carry over tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to carry over tasks',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageOpen className="h-5 w-5 text-amber-600" />
            Carry Over Incomplete Tasks
          </DialogTitle>
          <DialogDescription>
            Sprint "{currentSprintName}" has {incompleteTasks.length} incomplete task(s). 
            Choose which tasks to carry over and where to move them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Destination selector */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Move selected tasks to:
            </label>
            <div className="flex gap-3">
              {nextSprintId && (
                <Button
                  variant={destination === 'next-sprint' ? 'default' : 'outline'}
                  onClick={() => setDestination('next-sprint')}
                  className="flex-1"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Next Sprint: {nextSprintName}
                </Button>
              )}
              <Button
                variant={destination === 'backlog' ? 'default' : 'outline'}
                onClick={() => setDestination('backlog')}
                className="flex-1"
              >
                <PackageOpen className="h-4 w-4 mr-2" />
                Backlog
              </Button>
            </div>
          </div>

          {/* Task selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select tasks to carry over:
              </label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
              {incompleteTasks.map(task => (
                <div
                  key={task.$id}
                  className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <Checkbox
                    checked={selectedTaskIds.has(task.$id)}
                    onCheckedChange={() => toggleTask(task.$id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {task.hierarchyId}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          task.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : task.status === 'REVIEW'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          task.priority === 'CRITICAL'
                            ? 'bg-red-500'
                            : task.priority === 'HIGH'
                            ? 'bg-orange-500'
                            : task.priority === 'MEDIUM'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {task.priority.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-900 dark:text-blue-100 font-medium">
                {selectedTaskIds.size} task(s) selected
              </span>
            </div>
            {selectedTaskIds.size > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                These tasks will be moved to {destination === 'next-sprint' ? `"${nextSprintName}"` : 'Backlog'} 
                and reset to TODO status.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleCarryOver} disabled={isProcessing || selectedTaskIds.size === 0}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Carry Over {selectedTaskIds.size} Task(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
