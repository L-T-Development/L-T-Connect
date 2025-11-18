'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Filter, 
  X, 
  Calendar as CalendarIcon,
  Tag,
  User,
  Target,
  Zap,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import type { TaskStatus, TaskPriority } from '@/types';

export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigneeIds?: string[];
  epicIds?: string[];
  sprintIds?: string[];
  labels?: string[];
  createdDateFrom?: Date;
  createdDateTo?: Date;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  updatedDateFrom?: Date;
  updatedDateTo?: Date;
  hasEstimate?: boolean;
  isOverdue?: boolean;
  isBlocked?: boolean;
  hasSubtasks?: boolean;
}

interface AdvancedFiltersProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  availableAssignees?: { id: string; name: string; email: string }[];
  availableEpics?: { id: string; name: string }[];
  availableSprints?: { id: string; name: string }[];
  availableLabels?: string[];
}

const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'BACKLOG', label: 'Backlog', color: 'bg-gray-500' },
  { value: 'TODO', label: 'To Do', color: 'bg-blue-500' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-500' },
  { value: 'REVIEW', label: 'Review', color: 'bg-purple-500' },
  { value: 'DONE', label: 'Done', color: 'bg-green-500' },
];

const priorityOptions: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Low', color: 'text-green-600' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-600' },
  { value: 'HIGH', label: 'High', color: 'text-orange-600' },
  { value: 'CRITICAL', label: 'Critical', color: 'text-red-600' },
];

export function AdvancedFilters({
  filters,
  onFiltersChange,
  availableAssignees = [],
  availableEpics = [],
  availableSprints = [],
  availableLabels = [],
}: AdvancedFiltersProps) {
  const [open, setOpen] = React.useState(false);

  // Count active filters
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.status && filters.status.length > 0) count++;
    if (filters.priority && filters.priority.length > 0) count++;
    if (filters.assigneeIds && filters.assigneeIds.length > 0) count++;
    if (filters.epicIds && filters.epicIds.length > 0) count++;
    if (filters.sprintIds && filters.sprintIds.length > 0) count++;
    if (filters.labels && filters.labels.length > 0) count++;
    if (filters.createdDateFrom || filters.createdDateTo) count++;
    if (filters.dueDateFrom || filters.dueDateTo) count++;
    if (filters.updatedDateFrom || filters.updatedDateTo) count++;
    if (filters.hasEstimate !== undefined) count++;
    if (filters.isOverdue !== undefined) count++;
    if (filters.isBlocked !== undefined) count++;
    if (filters.hasSubtasks !== undefined) count++;
    return count;
  }, [filters]);

  const toggleStatus = (status: TaskStatus) => {
    const current = filters.status || [];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onFiltersChange({ ...filters, status: updated.length > 0 ? updated : undefined });
  };

  const togglePriority = (priority: TaskPriority) => {
    const current = filters.priority || [];
    const updated = current.includes(priority)
      ? current.filter(p => p !== priority)
      : [...current, priority];
    onFiltersChange({ ...filters, priority: updated.length > 0 ? updated : undefined });
  };

  const toggleAssignee = (assigneeId: string) => {
    const current = filters.assigneeIds || [];
    const updated = current.includes(assigneeId)
      ? current.filter(id => id !== assigneeId)
      : [...current, assigneeId];
    onFiltersChange({ ...filters, assigneeIds: updated.length > 0 ? updated : undefined });
  };

  const toggleEpic = (epicId: string) => {
    const current = filters.epicIds || [];
    const updated = current.includes(epicId)
      ? current.filter(id => id !== epicId)
      : [...current, epicId];
    onFiltersChange({ ...filters, epicIds: updated.length > 0 ? updated : undefined });
  };

  const toggleSprint = (sprintId: string) => {
    const current = filters.sprintIds || [];
    const updated = current.includes(sprintId)
      ? current.filter(id => id !== sprintId)
      : [...current, sprintId];
    onFiltersChange({ ...filters, sprintIds: updated.length > 0 ? updated : undefined });
  };

  const toggleLabel = (label: string) => {
    const current = filters.labels || [];
    const updated = current.includes(label)
      ? current.filter(l => l !== label)
      : [...current, label];
    onFiltersChange({ ...filters, labels: updated.length > 0 ? updated : undefined });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-0" align="start">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <h3 className="font-semibold">Advanced Filters</h3>
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-8 text-xs"
              >
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[500px]">
          <div className="p-4 space-y-6">
            {/* Status Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Status
              </Label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => {
                  const isSelected = filters.status?.includes(option.value);
                  return (
                    <Button
                      key={option.value}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleStatus(option.value)}
                      className="h-8"
                    >
                      {isSelected && <Check className="h-3 w-3 mr-1" />}
                      <span className={`h-2 w-2 rounded-full ${option.color} mr-2`} />
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Priority Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Priority
              </Label>
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map((option) => {
                  const isSelected = filters.priority?.includes(option.value);
                  return (
                    <Button
                      key={option.value}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => togglePriority(option.value)}
                      className="h-8"
                    >
                      {isSelected && <Check className="h-3 w-3 mr-1" />}
                      <span className={`text-lg ${option.color} mr-1`}>●</span>
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Assignee Filter */}
            {availableAssignees.length > 0 && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Assignees
                  </Label>
                  <ScrollArea className="h-[120px]">
                    <div className="space-y-2">
                      {availableAssignees.map((assignee) => {
                        const isSelected = filters.assigneeIds?.includes(assignee.id);
                        return (
                          <div
                            key={assignee.id}
                            onClick={() => toggleAssignee(assignee.id)}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                          >
                            <div className={`h-4 w-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-input'}`}>
                              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{assignee.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{assignee.email}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
                <Separator />
              </>
            )}

            {/* Epic Filter */}
            {availableEpics.length > 0 && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Epics</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableEpics.map((epic) => {
                      const isSelected = filters.epicIds?.includes(epic.id);
                      return (
                        <Button
                          key={epic.id}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleEpic(epic.id)}
                          className="h-8"
                        >
                          {isSelected && <Check className="h-3 w-3 mr-1" />}
                          {epic.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Sprint Filter */}
            {availableSprints.length > 0 && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Sprints</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableSprints.map((sprint) => {
                      const isSelected = filters.sprintIds?.includes(sprint.id);
                      return (
                        <Button
                          key={sprint.id}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleSprint(sprint.id)}
                          className="h-8"
                        >
                          {isSelected && <Check className="h-3 w-3 mr-1" />}
                          {sprint.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Labels Filter */}
            {availableLabels.length > 0 && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Labels
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {availableLabels.map((label) => {
                      const isSelected = filters.labels?.includes(label);
                      return (
                        <Button
                          key={label}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleLabel(label)}
                          className="h-8"
                        >
                          {isSelected && <Check className="h-3 w-3 mr-1" />}
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Date Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Date Ranges
              </Label>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Created Date */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Created Date From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.createdDateFrom ? format(filters.createdDateFrom, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.createdDateFrom}
                        onSelect={(date) => onFiltersChange({ ...filters, createdDateFrom: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Created Date To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.createdDateTo ? format(filters.createdDateTo, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.createdDateTo}
                        onSelect={(date) => onFiltersChange({ ...filters, createdDateTo: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Due Date From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dueDateFrom ? format(filters.dueDateFrom, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dueDateFrom}
                        onSelect={(date) => onFiltersChange({ ...filters, dueDateFrom: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Due Date To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dueDateTo ? format(filters.dueDateTo, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dueDateTo}
                        onSelect={(date) => onFiltersChange({ ...filters, dueDateTo: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <Separator />

            {/* Boolean Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Additional Filters</Label>
              <div className="space-y-2">
                <div
                  onClick={() => onFiltersChange({ ...filters, hasEstimate: filters.hasEstimate === true ? undefined : true })}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                >
                  <div className={`h-4 w-4 rounded border flex items-center justify-center ${filters.hasEstimate === true ? 'bg-primary border-primary' : 'border-input'}`}>
                    {filters.hasEstimate === true && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className="text-sm">Has time estimate</span>
                </div>

                <div
                  onClick={() => onFiltersChange({ ...filters, isOverdue: filters.isOverdue === true ? undefined : true })}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                >
                  <div className={`h-4 w-4 rounded border flex items-center justify-center ${filters.isOverdue === true ? 'bg-primary border-primary' : 'border-input'}`}>
                    {filters.isOverdue === true && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className="text-sm">Overdue tasks</span>
                </div>

                <div
                  onClick={() => onFiltersChange({ ...filters, isBlocked: filters.isBlocked === true ? undefined : true })}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                >
                  <div className={`h-4 w-4 rounded border flex items-center justify-center ${filters.isBlocked === true ? 'bg-primary border-primary' : 'border-input'}`}>
                    {filters.isBlocked === true && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className="text-sm">Blocked tasks</span>
                </div>

                <div
                  onClick={() => onFiltersChange({ ...filters, hasSubtasks: filters.hasSubtasks === true ? undefined : true })}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                >
                  <div className={`h-4 w-4 rounded border flex items-center justify-center ${filters.hasSubtasks === true ? 'bg-primary border-primary' : 'border-input'}`}>
                    {filters.hasSubtasks === true && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className="text-sm">Has subtasks</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between p-4 border-t bg-muted/50">
          <p className="text-sm text-muted-foreground">
            {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} applied
          </p>
          <Button onClick={() => setOpen(false)} size="sm">
            Apply Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
