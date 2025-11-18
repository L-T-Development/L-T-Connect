'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Inbox,
  User,
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle,
  UserX,
  Star,
  Filter,
} from 'lucide-react';
import type { TaskFilters } from '@/components/search/advanced-filters';
import { useSavedSearches, type SavedSearch } from '@/hooks/use-saved-searches';

interface QuickFilter {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  filters: TaskFilters;
  count?: number;
}

interface QuickFiltersSidebarProps {
  workspaceId: string;
  userId: string;
  activeFilters: TaskFilters;
  onApplyFilter: (filters: TaskFilters) => void;
  taskCounts?: Record<string, number>;
}

export function QuickFiltersSidebar({
  workspaceId,
  userId,
  activeFilters,
  onApplyFilter,
  taskCounts = {},
}: QuickFiltersSidebarProps) {
  const { data: savedSearches = [] } = useSavedSearches(workspaceId, userId);

  // Preset quick filters
  const quickFilters: QuickFilter[] = [
    {
      id: 'my-tasks',
      label: 'My Tasks',
      icon: <User className="h-4 w-4" />,
      description: 'Tasks assigned to me',
      filters: { assigneeIds: [userId] },
      count: taskCounts['my-tasks'],
    },
    {
      id: 'high-priority',
      label: 'High Priority',
      icon: <AlertCircle className="h-4 w-4" />,
      description: 'High and critical priority tasks',
      filters: { priority: ['HIGH', 'CRITICAL'] },
      count: taskCounts['high-priority'],
    },
    {
      id: 'due-today',
      label: 'Due Today',
      icon: <Calendar className="h-4 w-4" />,
      description: 'Tasks due today',
      filters: {
        dueDateFrom: new Date(new Date().setHours(0, 0, 0, 0)),
        dueDateTo: new Date(new Date().setHours(23, 59, 59, 999)),
      },
      count: taskCounts['due-today'],
    },
    {
      id: 'overdue',
      label: 'Overdue',
      icon: <Clock className="h-4 w-4" />,
      description: 'Tasks past their due date',
      filters: { isOverdue: true },
      count: taskCounts['overdue'],
    },
    {
      id: 'in-progress',
      label: 'In Progress',
      icon: <CheckCircle className="h-4 w-4" />,
      description: 'Tasks currently being worked on',
      filters: { status: ['IN_PROGRESS'] },
      count: taskCounts['in-progress'],
    },
    {
      id: 'review',
      label: 'In Review',
      icon: <Inbox className="h-4 w-4" />,
      description: 'Tasks awaiting review',
      filters: { status: ['REVIEW'] },
      count: taskCounts['review'],
    },
    {
      id: 'unassigned',
      label: 'Unassigned',
      icon: <UserX className="h-4 w-4" />,
      description: 'Tasks without an assignee',
      filters: { assigneeIds: [] },
      count: taskCounts['unassigned'],
    },
    {
      id: 'blocked',
      label: 'Blocked',
      icon: <AlertCircle className="h-4 w-4" />,
      description: 'Tasks that are blocked',
      filters: { isBlocked: true },
      count: taskCounts['blocked'],
    },
  ];

  // Check if a filter is active
  const isFilterActive = (filter: TaskFilters): boolean => {
    return JSON.stringify(filter) === JSON.stringify(activeFilters);
  };

  const isSavedSearchActive = (search: SavedSearch): boolean => {
    return JSON.stringify(search.filters) === JSON.stringify(activeFilters);
  };

  return (
    <div className="w-64 border-r bg-muted/30">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <h3 className="font-semibold">Quick Filters</h3>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-4 space-y-6">
          {/* Preset Filters */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Presets
            </p>
            {quickFilters.map((filter) => (
              <Button
                key={filter.id}
                variant={isFilterActive(filter.filters) ? 'secondary' : 'ghost'}
                className="w-full justify-start h-auto py-3 px-3"
                onClick={() => onApplyFilter(filter.filters)}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="mt-0.5">{filter.icon}</div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{filter.label}</span>
                      {filter.count !== undefined && filter.count > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {filter.count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {filter.description}
                    </p>
                  </div>
                </div>
              </Button>
            ))}
          </div>

          {/* Saved Searches */}
          {savedSearches.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Saved Searches
                </p>
                {savedSearches.slice(0, 10).map((search) => (
                  <Button
                    key={search.$id}
                    variant={isSavedSearchActive(search) ? 'secondary' : 'ghost'}
                    className="w-full justify-start h-auto py-3 px-3"
                    onClick={() => onApplyFilter(search.filters)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div className="mt-0.5">
                        <Star className="h-4 w-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">
                            {search.name}
                          </span>
                          {search.useCount > 0 && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {search.useCount}
                            </Badge>
                          )}
                        </div>
                        {search.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {search.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </>
          )}

          {/* Clear Filters */}
          {Object.keys(activeFilters).length > 0 && (
            <>
              <Separator />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onApplyFilter({})}
              >
                Clear All Filters
              </Button>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
