'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, RotateCcw, Settings, Coffee, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface PomodoroTimerProps {
  userId: string;
  userName: string;
  userEmail: string;
}

interface PomodoroSettings {
  workDuration: number; // minutes
  breakDuration: number; // minutes
  longBreakDuration: number; // minutes
  longBreakInterval: number; // sessions before long break
  currentSession: number;
  isBreak: boolean;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  currentSession: 1,
  isBreak: false,
};

export function PomodoroTimer({
  userId,
  userName,
  userEmail,
}: PomodoroTimerProps) {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [description, setDescription] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const { data: activeTimer } = useActiveTimer(userId);
  const { data: workspace } = useWorkspace();
  const { data: tasks } = useWorkspaceTasks(workspace?.$id);

  const startTimerMutation = useStartTimer();
  const toggleTimerMutation = useToggleTimer();
  const stopTimerMutation = useStopTimer();

  const isPomodoroActive = activeTimer?.type === 'POMODORO';
  const pomodoroSettings = isPomodoroActive && activeTimer?.pomodoroSettings
    ? (typeof activeTimer.pomodoroSettings === 'string'
        ? JSON.parse(activeTimer.pomodoroSettings)
        : activeTimer.pomodoroSettings)
    : null;

  // Calculate remaining time
  useEffect(() => {
    if (!isPomodoroActive || !activeTimer) {
      setRemainingSeconds(0);
      return;
    }

    const calculateRemaining = () => {
      const elapsed = Math.floor(
        (Date.now() - new Date(activeTimer.startTime).getTime()) / 1000
      );
      
      const totalDuration = pomodoroSettings.isBreak
        ? (pomodoroSettings.currentSession % pomodoroSettings.longBreakInterval === 0
            ? pomodoroSettings.longBreakDuration
            : pomodoroSettings.breakDuration) * 60
        : pomodoroSettings.workDuration * 60;

      const remaining = Math.max(0, totalDuration - elapsed);
      setRemainingSeconds(remaining);

      // Auto-complete when time runs out
      if (remaining === 0 && !activeTimer.isPaused) {
        handleComplete();
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [isPomodoroActive, activeTimer, pomodoroSettings]);

  const handleStart = async () => {
    if (!workspace) return;

    const selectedTask = tasks?.find((t: Task) => t.$id === selectedTaskId);

    await startTimerMutation.mutateAsync({
      userId,
      taskId: selectedTaskId || undefined,
      taskTitle: selectedTask?.title,
      taskHierarchyId: selectedTask?.hierarchyId,
      projectId: selectedTask?.projectId,
      description: description || 'Pomodoro session',
      type: 'POMODORO',
      pomodoroSettings: {
        ...settings,
        currentSession: 1,
        isBreak: false,
      },
    });

    setIsStartDialogOpen(false);
    setDescription('');
    setSelectedTaskId('');
  };

  const handleToggle = async () => {
    if (!activeTimer) return;

    const now = new Date().toISOString();

    if (activeTimer.isPaused) {
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
      await toggleTimerMutation.mutateAsync({
        timerId: activeTimer.$id,
        userId,
        isPaused: true,
        pausedAt: now,
      });
    }
  };

  const handleComplete = async () => {
    if (!activeTimer || !workspace) return;

    // If work session, save entry and start break
    if (!pomodoroSettings.isBreak) {
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
        isBillable: false,
        type: 'POMODORO',
      });

      // Auto-start break
      const isLongBreak = pomodoroSettings.currentSession % pomodoroSettings.longBreakInterval === 0;
      
      await startTimerMutation.mutateAsync({
        userId,
        description: isLongBreak ? 'Long break' : 'Short break',
        type: 'POMODORO',
        pomodoroSettings: {
          ...pomodoroSettings,
          isBreak: true,
        },
      });

      // Notify user
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Pomodoro Complete!', {
          body: `Great work! Time for a ${isLongBreak ? 'long' : 'short'} break.`,
          icon: '/icon.png',
        });
      }
    } else {
      // Break complete, ready for next work session
      await stopTimerMutation.mutateAsync({
        timerId: activeTimer.$id,
        userId,
        workspaceId: workspace.$id,
        userName,
        userEmail,
        description: activeTimer.description,
        startTime: activeTimer.startTime,
        totalPausedTime: activeTimer.totalPausedTime || 0,
        isBillable: false,
        type: 'POMODORO',
      });

      // Notify user
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Break Complete!', {
          body: 'Ready to start the next Pomodoro session?',
          icon: '/icon.png',
        });
      }
    }
  };

  const handleSkip = async () => {
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
      isBillable: false,
      type: 'POMODORO',
    });
  };

  const totalDuration = pomodoroSettings
    ? (pomodoroSettings.isBreak
        ? (pomodoroSettings.currentSession % pomodoroSettings.longBreakInterval === 0
            ? pomodoroSettings.longBreakDuration
            : pomodoroSettings.breakDuration)
        : pomodoroSettings.workDuration) * 60
    : settings.workDuration * 60;

  const progress = totalDuration > 0
    ? ((totalDuration - remainingSeconds) / totalDuration) * 100
    : 0;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Pomodoro Timer
          </CardTitle>
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pomodoro Settings</DialogTitle>
                <DialogDescription>
                  Customize your Pomodoro timer intervals
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workDuration">Work Duration (minutes)</Label>
                  <Input
                    id="workDuration"
                    type="number"
                    value={settings.workDuration}
                    onChange={(e) =>
                      setSettings({ ...settings, workDuration: parseInt(e.target.value) || 25 })
                    }
                    min="1"
                    max="60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="breakDuration">Short Break (minutes)</Label>
                  <Input
                    id="breakDuration"
                    type="number"
                    value={settings.breakDuration}
                    onChange={(e) =>
                      setSettings({ ...settings, breakDuration: parseInt(e.target.value) || 5 })
                    }
                    min="1"
                    max="30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longBreakDuration">Long Break (minutes)</Label>
                  <Input
                    id="longBreakDuration"
                    type="number"
                    value={settings.longBreakDuration}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        longBreakDuration: parseInt(e.target.value) || 15,
                      })
                    }
                    min="1"
                    max="60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longBreakInterval">Long Break Interval (sessions)</Label>
                  <Input
                    id="longBreakInterval"
                    type="number"
                    value={settings.longBreakInterval}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        longBreakInterval: parseInt(e.target.value) || 4,
                      })
                    }
                    min="2"
                    max="10"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsSettingsOpen(false)}>Save Settings</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isPomodoroActive && activeTimer ? (
          <>
            {/* Status Badge */}
            <div className="flex items-center justify-center">
              <Badge
                variant={pomodoroSettings.isBreak ? 'secondary' : 'default'}
                className="text-lg px-4 py-2"
              >
                {pomodoroSettings.isBreak ? (
                  <>
                    <Coffee className="h-4 w-4 mr-2" />
                    {pomodoroSettings.currentSession % pomodoroSettings.longBreakInterval === 0
                      ? 'Long Break'
                      : 'Short Break'}
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Session {pomodoroSettings.currentSession}
                  </>
                )}
              </Badge>
            </div>

            {/* Timer Display */}
            <div className="text-center">
              <div className="text-6xl font-mono font-bold mb-2">
                {formatDuration(remainingSeconds)}
              </div>
              {activeTimer.description && (
                <div className="text-sm text-muted-foreground">
                  {activeTimer.description}
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <Progress value={progress} className="h-2" />

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleToggle}
                disabled={toggleTimerMutation.isPending}
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
                variant="outline"
                onClick={handleSkip}
                disabled={stopTimerMutation.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Skip
              </Button>
              <Button
                variant="destructive"
                onClick={handleComplete}
                disabled={stopTimerMutation.isPending}
              >
                <Square className="h-4 w-4 mr-2" />
                Complete
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Start New Session */}
            <div className="text-center space-y-4">
              <div className="text-4xl font-mono font-bold">
                {formatDuration(settings.workDuration * 60)}
              </div>
              <p className="text-sm text-muted-foreground">
                {settings.workDuration}min work · {settings.breakDuration}min break
              </p>

              <Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="w-full">
                    <Play className="h-5 w-5 mr-2" />
                    Start Pomodoro
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start Pomodoro Session</DialogTitle>
                    <DialogDescription>
                      Focus for {settings.workDuration} minutes on a single task
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
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
                      <Label htmlFor="description">What will you work on?</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your focus..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleStart}
                      disabled={!description.trim() || startTimerMutation.isPending}
                    >
                      Start Session
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
