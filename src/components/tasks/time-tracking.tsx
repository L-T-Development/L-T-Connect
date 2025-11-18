'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Pause, StopCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeTrackingProps {
  estimatedHours?: number;
  actualHours?: number;
  onUpdateEstimate: (hours: number) => void;
  onUpdateActual: (hours: number) => void;
  readonly?: boolean;
}

export function TimeTracking({
  estimatedHours = 0,
  actualHours = 0,
  onUpdateEstimate,
  onUpdateActual,
  readonly = false,
}: TimeTrackingProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualHours, setManualHours] = useState('');

  // Timer effect
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStartTimer = () => {
    setIsRunning(true);
    setElapsedSeconds(0);
  };

  const handlePauseTimer = () => {
    setIsRunning(false);
  };

  const handleStopTimer = () => {
    if (elapsedSeconds > 0) {
      const hoursToAdd = elapsedSeconds / 3600;
      onUpdateActual(actualHours + hoursToAdd);
    }
    setIsRunning(false);
    setElapsedSeconds(0);
  };

  const handleManualEntry = () => {
    const hours = parseFloat(manualHours);
    if (!isNaN(hours) && hours > 0) {
      onUpdateActual(actualHours + hours);
      setManualHours('');
      setShowManualEntry(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  const progressPercentage = estimatedHours > 0 
    ? Math.min((actualHours / estimatedHours) * 100, 100) 
    : 0;

  const isOverBudget = estimatedHours > 0 && actualHours > estimatedHours;

  return (
    <div className="space-y-4">
      {/* Estimate Input */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Time Estimate
        </Label>
        {readonly ? (
          <p className="text-sm">
            {estimatedHours > 0 ? formatHours(estimatedHours) : 'No estimate set'}
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.5"
              min="0"
              value={estimatedHours || ''}
              onChange={(e) => onUpdateEstimate(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
        )}
      </div>

      {/* Timer */}
      {!readonly && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Timer</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 rounded-lg border bg-muted/50">
              <div className="text-2xl font-mono tabular-nums">
                {formatTime(elapsedSeconds)}
              </div>
            </div>
            {!isRunning ? (
              <Button
                variant="outline"
                size="icon"
                onClick={handleStartTimer}
                className="h-12 w-12"
              >
                <Play className="h-5 w-5" />
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePauseTimer}
                  className="h-12 w-12"
                >
                  <Pause className="h-5 w-5" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={handleStopTimer}
                  className="h-12 w-12"
                >
                  <StopCircle className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Time Logged */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Time Logged</Label>
          {!readonly && !showManualEntry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowManualEntry(true)}
              className="h-7 gap-1"
            >
              <Plus className="h-3 w-3" />
              Add Time
            </Button>
          )}
        </div>

        {showManualEntry && (
          <div className="flex items-center gap-2 p-2 border rounded-lg">
            <Input
              type="number"
              step="0.5"
              min="0"
              value={manualHours}
              onChange={(e) => setManualHours(e.target.value)}
              placeholder="1.5"
              className="w-20"
              autoFocus
            />
            <span className="text-sm text-muted-foreground">hours</span>
            <Button size="sm" onClick={handleManualEntry}>
              Add
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setShowManualEntry(false);
                setManualHours('');
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Logged</span>
            <Badge 
              variant="secondary"
              className={cn(
                isOverBudget && 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
              )}
            >
              {formatHours(actualHours)}
            </Badge>
          </div>

          {estimatedHours > 0 && (
            <>
              <Progress 
                value={progressPercentage} 
                className={cn(
                  'h-2',
                  isOverBudget && '[&>*]:bg-red-500'
                )}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {progressPercentage.toFixed(0)}% of estimate
                </span>
                <span>
                  {formatHours(Math.max(0, estimatedHours - actualHours))} remaining
                </span>
              </div>
            </>
          )}

          {isOverBudget && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <StopCircle className="h-3 w-3" />
              Over budget by {formatHours(actualHours - estimatedHours)}
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Use the timer or add time manually to track work on this task
      </p>
    </div>
  );
}

// Time Badge for task cards
interface TimeTrackedBadgeProps {
  estimatedHours?: number;
  actualHours?: number;
}

export function TimeTrackedBadge({ estimatedHours, actualHours = 0 }: TimeTrackedBadgeProps) {
  if (!estimatedHours && !actualHours) return null;

  const isOverBudget = estimatedHours && actualHours > estimatedHours;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'gap-1',
        isOverBudget 
          ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
          : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
      )}
    >
      <Clock className="h-3 w-3" />
      {actualHours.toFixed(1)}
      {estimatedHours && `/${estimatedHours}`}h
    </Badge>
  );
}
