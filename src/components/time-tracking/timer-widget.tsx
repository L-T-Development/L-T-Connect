'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  useActiveTimer,
  useStartTimer,
  useToggleTimer,
  useStopTimer,
} from '@/hooks/use-time-entry';
import { useWorkspaceTasks } from '@/hooks/use-task';
import { useWorkspace } from '@/hooks/use-workspace';
import { formatDuration } from '@/lib/utils/time-format';
import type { Task } from '@/types';

interface TimerWidgetProps {
  userId: string;
  userName: string;
  userEmail: string;
}

export function TimerWidget({ userId, userName, userEmail }: TimerWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isBillable, setIsBillable] = useState(false);
  const [billableRate, setBillableRate] = useState('');

  const { data: activeTimer, isLoading } = useActiveTimer(userId);
  const { data: workspace } = useWorkspace();
  const { data: tasks } = useWorkspaceTasks(workspace?.$id);
  
  const startTimerMutation = useStartTimer();
  const toggleTimerMutation = useToggleTimer();
  const stopTimerMutation = useStopTimer();

  // Calculate elapsed time
  useEffect(() => {
    if (!activeTimer) {
      setElapsedTime(0);
      return;
    }

    const calculateElapsed = () => {
      const now = new Date().getTime();
      const start = new Date(activeTimer.startTime).getTime();
      let elapsed = Math.floor((now - start) / 1000); // in seconds

      // Subtract paused time
      if (activeTimer.isPaused && activeTimer.pausedAt) {
        const pausedDuration = Math.floor(
          (now - new Date(activeTimer.pausedAt).getTime()) / 1000
        );
        elapsed -= pausedDuration;
      }

      // Subtract total paused time
      elapsed -= (activeTimer.totalPausedTime || 0) * 60;

      setElapsedTime(Math.max(0, elapsed));
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  const handleStartTimer = async () => {
    if (!workspace) return;

    const selectedTask = tasks?.find((t: Task) => t.$id === selectedTaskId);

    await startTimerMutation.mutateAsync({
      userId,
      taskId: selectedTaskId || undefined,
      taskTitle: selectedTask?.title,
      taskHierarchyId: selectedTask?.hierarchyId,
      projectId: selectedTask?.projectId,
      description: description || 'Working on task',
      type: 'TIMER',
    });

    setIsOpen(false);
    setDescription('');
    setSelectedTaskId('');
  };

  const handleToggleTimer = async () => {
    if (!activeTimer) return;

    const now = new Date().toISOString();
    
    if (activeTimer.isPaused) {
      // Resume timer
      const pausedDuration = activeTimer.pausedAt
        ? Math.floor(
            (new Date().getTime() - new Date(activeTimer.pausedAt).getTime()) /
              1000 /
              60
          )
        : 0;

      await toggleTimerMutation.mutateAsync({
        timerId: activeTimer.$id,
        userId,
        isPaused: false,
        pausedAt: undefined,
        totalPausedTime: (activeTimer.totalPausedTime || 0) + pausedDuration,
      });
    } else {
      // Pause timer
      await toggleTimerMutation.mutateAsync({
        timerId: activeTimer.$id,
        userId,
        isPaused: true,
        pausedAt: now,
      });
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer || !workspace) return;

    await stopTimerMutation.mutateAsync({
      timerId: activeTimer.$id,
      userId,
      workspaceId: workspace.$id,
      userName,
      userEmail,
      taskId: activeTimer.taskId,
      taskTitle: activeTimer.taskTitle,
      taskHierarchyId: activeTimer.taskHierarchyId,
      projectId: activeTimer.projectId,
      projectName: undefined,
      description: activeTimer.description,
      startTime: activeTimer.startTime,
      totalPausedTime: activeTimer.totalPausedTime || 0,
      isBillable,
      billableRate: billableRate ? parseFloat(billableRate) : undefined,
      type: activeTimer.type,
    });

    setIsBillable(false);
    setBillableRate('');
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Clock className="h-4 w-4 mr-2" />
        <span className="text-sm">--:--</span>
      </Button>
    );
  }

  if (activeTimer) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={activeTimer.isPaused ? 'outline' : 'default'}
            size="sm"
            className="gap-2"
          >
            <Clock className="h-4 w-4" />
            <span className="font-mono text-sm">
              {formatDuration(elapsedTime)}
            </span>
            {activeTimer.taskTitle && (
              <Badge variant="secondary" className="ml-2">
                {activeTimer.taskTitle}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Active Timer</h4>
              <p className="text-sm text-muted-foreground mb-2">
                {activeTimer.description}
              </p>
              {activeTimer.taskTitle && (
                <Badge variant="secondary">{activeTimer.taskTitle}</Badge>
              )}
            </div>

            <div className="flex items-center justify-center py-4">
              <span className="text-4xl font-mono">
                {formatDuration(elapsedTime)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="billable" className="text-sm">
                  Billable
                </Label>
                <Switch
                  id="billable"
                  checked={isBillable}
                  onCheckedChange={setIsBillable}
                />
              </div>

              {isBillable && (
                <div>
                  <Label htmlFor="rate" className="text-sm">
                    Hourly Rate ($)
                  </Label>
                  <Input
                    id="rate"
                    type="number"
                    value={billableRate}
                    onChange={(e) => setBillableRate(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleTimer}
                disabled={toggleTimerMutation.isPending}
                className="flex-1"
              >
                {activeTimer.isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStopTimer}
                disabled={stopTimerMutation.isPending}
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Clock className="h-4 w-4 mr-2" />
          Start Timer
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Start Timer</h4>
            <p className="text-sm text-muted-foreground">
              Track time for your work
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task">Task (Optional)</Label>
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                {tasks?.map((task: Task) => (
                  <SelectItem key={task.$id} value={task.$id}>
                    {task.hierarchyId} - {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you working on?"
              rows={3}
            />
          </div>

          <Button
            onClick={handleStartTimer}
            disabled={!description.trim() || startTimerMutation.isPending}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Timer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
