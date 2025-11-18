'use client';

import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ListChecks,
  User,
  Flag,
  Tag,
  Link,
  Calendar,
  File,
  MessageSquare,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskActivity {
  $id: string;
  taskId: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string; // 'created', 'updated', 'status_changed', 'assigned', 'commented', etc.
  field?: string; // Which field was changed
  oldValue?: string;
  newValue?: string;
  $createdAt: string;
}

interface TaskActivityLogProps {
  activities: TaskActivity[];
  maxHeight?: string;
}

function getActivityIcon(action: string, field?: string) {
  if (action === 'created') return File;
  if (action === 'commented') return MessageSquare;
  if (field === 'status') return ListChecks;
  if (field === 'assigneeIds' || field === 'assignees') return User;
  if (field === 'priority') return Flag;
  if (field === 'labels') return Tag;
  if (field === 'blockedBy' || field === 'blocks') return Link;
  if (field === 'dueDate') return Calendar;
  if (field === 'watcherIds' || field === 'watchers') return Eye;
  return ArrowRight;
}

function getActivityColor(action: string, field?: string) {
  if (action === 'created') return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950';
  if (action === 'commented') return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950';
  if (field === 'status') return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950';
  if (field === 'priority') return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950';
  if (field === 'assigneeIds' || field === 'assignees') return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950';
  return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-950';
}

function formatActivityDescription(activity: TaskActivity) {
  const { action, field, oldValue, newValue } = activity;

  if (action === 'created') {
    return 'created this task';
  }

  if (action === 'commented') {
    return 'added a comment';
  }

  if (action === 'updated' && field) {
    const fieldLabels: Record<string, string> = {
      status: 'status',
      priority: 'priority',
      assigneeIds: 'assignees',
      assignees: 'assignees',
      watcherIds: 'watchers',
      watchers: 'watchers',
      labels: 'labels',
      dueDate: 'due date',
      blockedBy: 'blocked by dependencies',
      blocks: 'blocking dependencies',
      title: 'title',
      description: 'description',
    };

    const fieldLabel = fieldLabels[field] || field;

    if (oldValue && newValue) {
      return (
        <>
          changed <strong>{fieldLabel}</strong> from{' '}
          <Badge variant="outline" className="mx-1">
            {oldValue}
          </Badge>
          to
          <Badge variant="outline" className="mx-1">
            {newValue}
          </Badge>
        </>
      );
    } else if (newValue) {
      return (
        <>
          set <strong>{fieldLabel}</strong> to{' '}
          <Badge variant="outline" className="mx-1">
            {newValue}
          </Badge>
        </>
      );
    } else if (oldValue) {
      return (
        <>
          removed <strong>{fieldLabel}</strong>
        </>
      );
    } else {
      return `updated ${fieldLabel}`;
    }
  }

  return `performed ${action}`;
}

export function TaskActivityLog({ activities, maxHeight = '400px' }: TaskActivityLogProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="pr-4" style={{ maxHeight }}>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = getActivityIcon(activity.action, activity.field);
          const colorClass = getActivityColor(activity.action, activity.field);
          const initials = activity.userName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          const isLast = index === activities.length - 1;

          return (
            <div key={activity.$id} className="flex gap-3 relative">
              {/* Timeline Line */}
              {!isLast && (
                <div className="absolute left-[18px] top-[36px] bottom-[-16px] w-[2px] bg-border" />
              )}

              {/* Avatar with Icon */}
              <div className="relative flex-shrink-0">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-background',
                    colorClass
                  )}
                >
                  <Icon className="h-3 w-3" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-1 pt-1">
                <div className="text-sm">
                  <span className="font-medium">{activity.userName}</span>{' '}
                  <span className="text-muted-foreground">
                    {formatActivityDescription(activity)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.$createdAt), { addSuffix: true })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// Activity type definition for database
export interface TaskActivityInput {
  taskId: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: 'created' | 'updated' | 'commented' | 'deleted';
  field?: string;
  oldValue?: string;
  newValue?: string;
}
