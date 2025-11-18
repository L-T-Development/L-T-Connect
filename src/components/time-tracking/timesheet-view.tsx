'use client';

import React, { useState, useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isWeekend,
  isToday,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Edit, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTimeEntries, useDeleteTimeEntry } from '@/hooks/use-time-entry';
import { ManualTimeEntryDialog } from './manual-time-entry-dialog';
import { formatMinutesHuman } from '@/lib/utils/time-format';
import type { TimeEntry, TimesheetDay } from '@/types';
import { cn } from '@/lib/utils';

interface TimesheetViewProps {
  userId: string;
  userName: string;
  userEmail: string;
  workspaceId: string;
}

type ViewMode = 'week' | 'month';

export function TimesheetView({
  userId,
  userName,
  userEmail,
  workspaceId,
}: TimesheetViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  const { data: timeEntries = [] } = useTimeEntries(userId, {
    workspaceId,
  });

  const deleteTimeEntryMutation = useDeleteTimeEntry();

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    } else {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      };
    }
  }, [currentDate, viewMode]);

  // Get days to display
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: dateRange.start,
      end: dateRange.end,
    });
  }, [dateRange]);

  // Group time entries by day
  const timesheetData = useMemo(() => {
    const grouped = new Map<string, TimesheetDay>();

    days.forEach((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      grouped.set(dayStr, {
        date: dayStr,
        entries: [],
        totalHours: 0,
        billableHours: 0,
        isWeekend: isWeekend(day),
        isToday: isToday(day),
      });
    });

    timeEntries.forEach((entry) => {
      const entryDate = format(new Date(entry.startTime), 'yyyy-MM-dd');
      const dayData = grouped.get(entryDate);

      if (dayData) {
        dayData.entries.push(entry);
        dayData.totalHours += entry.duration;
        if (entry.isBillable) {
          dayData.billableHours += entry.duration;
        }
      }
    });

    return Array.from(grouped.values());
  }, [days, timeEntries]);

  // Calculate totals
  const totals = useMemo(() => {
    return timesheetData.reduce(
      (acc, day) => {
        acc.totalHours += day.totalHours;
        acc.billableHours += day.billableHours;
        return acc;
      },
      { totalHours: 0, billableHours: 0 }
    );
  }, [timesheetData]);

  const handlePrevious = () => {
    setCurrentDate((date) =>
      viewMode === 'week' ? subWeeks(date, 1) : subWeeks(date, 4)
    );
  };

  const handleNext = () => {
    setCurrentDate((date) =>
      viewMode === 'week' ? addWeeks(date, 1) : addWeeks(date, 4)
    );
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (confirm('Are you sure you want to delete this time entry?')) {
      await deleteTimeEntryMutation.mutateAsync({ id: entryId, userId });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Timesheet
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-lg font-semibold">
                {viewMode === 'week'
                  ? `${format(dateRange.start, 'MMM d')} - ${format(
                      dateRange.end,
                      'MMM d, yyyy'
                    )}`
                  : format(currentDate, 'MMMM yyyy')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>

              <ManualTimeEntryDialog
                userId={userId}
                userName={userName}
                userEmail={userEmail}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Log Time
                  </Button>
                }
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground mb-1">Total Hours</div>
              <div className="text-2xl font-bold">
                {formatMinutesHuman(totals.totalHours)}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground mb-1">Billable Hours</div>
              <div className="text-2xl font-bold text-green-600">
                {formatMinutesHuman(totals.billableHours)}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground mb-1">Non-Billable Hours</div>
              <div className="text-2xl font-bold text-orange-600">
                {formatMinutesHuman(totals.totalHours - totals.billableHours)}
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="space-y-2">
            {timesheetData.map((day) => (
              <DayRow
                key={day.date}
                day={day}
                onDeleteEntry={handleDeleteEntry}
                isDeleting={deleteTimeEntryMutation.isPending}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface DayRowProps {
  day: TimesheetDay;
  onDeleteEntry: (id: string) => void;
  isDeleting: boolean;
}

function DayRow({ day, onDeleteEntry, isDeleting }: DayRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const dayDate = new Date(day.date);

  return (
    <div
      className={cn(
        'rounded-lg border transition-colors',
        day.isToday && 'border-primary',
        day.isWeekend && 'bg-muted/30'
      )}
    >
      {/* Day Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="min-w-[100px]">
            <div className="font-semibold">
              {format(dayDate, 'EEE, MMM d')}
            </div>
            {day.isToday && (
              <Badge variant="default" className="text-xs">
                Today
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="font-medium">{formatMinutesHuman(day.totalHours)}</span>
            {day.entries.length > 0 && (
              <span>({day.entries.length} entries)</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {day.billableHours > 0 && (
            <Badge variant="secondary" className="text-xs">
              ${((day.billableHours / 60) * 50).toFixed(2)} billable
            </Badge>
          )}
        </div>
      </button>

      {/* Expanded Entries */}
      {isExpanded && day.entries.length > 0 && (
        <div className="border-t p-3 space-y-2 bg-muted/20">
          {day.entries.map((entry) => (
            <TimeEntryCard
              key={entry.$id}
              entry={entry}
              onDelete={onDeleteEntry}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}

      {/* No Entries Message */}
      {isExpanded && day.entries.length === 0 && (
        <div className="border-t p-4 text-center text-sm text-muted-foreground">
          No time entries for this day
        </div>
      )}
    </div>
  );
}

interface TimeEntryCardProps {
  entry: TimeEntry;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function TimeEntryCard({ entry, onDelete, isDeleting }: TimeEntryCardProps) {
  return (
    <div className="flex items-start justify-between p-3 rounded-md bg-card hover:bg-muted/50 transition-colors">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          {entry.taskTitle && (
            <Badge variant="outline" className="text-xs">
              {entry.taskHierarchyId}
            </Badge>
          )}
          {entry.isBillable && (
            <Badge variant="default" className="text-xs bg-green-600">
              Billable
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {entry.type}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              entry.status === 'APPROVED' && 'border-green-600 text-green-600',
              entry.status === 'REJECTED' && 'border-red-600 text-red-600'
            )}
          >
            {entry.status}
          </Badge>
        </div>

        <div className="text-sm font-medium">{entry.description}</div>

        {entry.taskTitle && (
          <div className="text-xs text-muted-foreground">{entry.taskTitle}</div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            {format(new Date(entry.startTime), 'HH:mm')} -{' '}
            {format(new Date(entry.endTime), 'HH:mm')}
          </span>
          <span className="font-medium">{formatMinutesHuman(entry.duration)}</span>
          {entry.isBillable && entry.billableRate && (
            <span className="text-green-600 font-medium">
              ${((entry.duration / 60) * entry.billableRate).toFixed(2)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Edit className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit entry</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => onDelete(entry.$id)}
                disabled={isDeleting}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete entry</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
