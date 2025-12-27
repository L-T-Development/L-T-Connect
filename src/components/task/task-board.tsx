'use client';

import * as React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTasksRealtime } from '@/hooks/use-realtime';
import type { Task, TaskStatus } from '@/types';
import { MoreVertical, Clock, AlertCircle, Circle, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

// Helper function to parse label format "color:text"
const parseLabel = (label: string) => {
  const parts = label.split(':');
  if (parts.length === 2) {
    return { color: parts[0], text: parts[1] };
  }
  return { color: 'gray', text: label };
};

// Color mapping for label backgrounds
const labelColorMap: Record<string, string> = {
  red: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  orange: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  green: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  pink: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
  gray: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
};

interface TaskBoardProps {
  tasks: Task[];
  projectId?: string;
  showMenu?: boolean;
  onTaskMove: (taskId: string, newStatus: TaskStatus, newPosition: number) => void;
  onTaskClick: (task: Task) => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
}

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'BACKLOG', title: 'Backlog', color: 'bg-gray-100 dark:bg-gray-800' },
  { id: 'TODO', title: 'To Do', color: 'bg-blue-100 dark:bg-blue-900' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-yellow-100 dark:bg-yellow-900' },
  { id: 'REVIEW', title: 'Review', color: 'bg-purple-100 dark:bg-purple-900' },
  { id: 'DONE', title: 'Done', color: 'bg-green-100 dark:bg-green-900' },
];

const priorityConfig = {
  CRITICAL: { label: 'Critical', color: 'destructive', icon: AlertCircle },
  HIGH: { label: 'High', color: 'orange', icon: AlertCircle },
  MEDIUM: { label: 'Medium', color: 'yellow', icon: Circle },
  LOW: { label: 'Low', color: 'gray', icon: Circle },
};

export function TaskBoard({
  tasks,
  projectId,
  showMenu = false,
  onTaskMove,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
}: TaskBoardProps) {
  // Enable real-time updates for tasks
  useTasksRealtime(projectId);

  // Group tasks by status
  const tasksByStatus = React.useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      BACKLOG: [],
      TODO: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
    };

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Sort by position
    Object.keys(grouped).forEach((status) => {
      grouped[status as TaskStatus].sort((a, b) => a.position - b.position);
    });

    return grouped;
  }, [tasks]);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside a droppable area
    if (!destination) return;

    // Dropped in same position
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;
    const newPosition = destination.index;

    onTaskMove(draggableId, newStatus, newPosition);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {COLUMNS.map((column) => {
          const columnTasks = tasksByStatus[column.id];
          const hasItems = columnTasks.length > 0;

          return (
            <div key={column.id} className="flex flex-col min-h-[200px]">
              {/* Column Header */}
              <div className={cn('rounded-t-lg p-3 border-b', column.color)}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">
                    {column.title}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({columnTasks.length})
                    </span>
                  </h3>
                </div>
              </div>

              {/* Droppable Column */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex-1 p-2 space-y-2 rounded-b-lg bg-muted/20',
                      snapshot.isDraggingOver && 'bg-muted/40',
                      hasItems ? 'min-h-[300px]' : 'min-h-[150px]'
                    )}
                  >
                    {columnTasks.map((task, index) => (
                      <Draggable key={task.$id} draggableId={task.$id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              'cursor-pointer hover:shadow-lg transition-shadow',
                              snapshot.isDragging && 'shadow-xl ring-2 ring-primary'
                            )}
                            onClick={() => onTaskClick(task)}
                          >
                            <CardHeader className="p-3 pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-xs">
                                      {task.hierarchyId}
                                    </Badge>
                                    <Badge
                                      variant={priorityConfig[task.priority].color as any}
                                      className="text-xs"
                                    >
                                      {priorityConfig[task.priority].label}
                                    </Badge>
                                  </div>
                                  <h4 className="font-medium text-sm leading-tight line-clamp-2">
                                    {task.title}
                                  </h4>
                                </div>

                                {showMenu === true && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      asChild
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onTaskEdit(task);
                                        }}
                                      >
                                        Edit Task
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onTaskDelete(task.$id);
                                        }}
                                      >
                                        Delete Task
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </CardHeader>

                            <CardContent className="p-3 pt-0 space-y-2">
                              {/* Description preview */}
                              {task.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {task.description}
                                </p>
                              )}

                              {/* Labels */}
                              {task.labels && task.labels.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {task.labels.slice(0, 3).map((label, i) => {
                                    const { color, text } = parseLabel(label);
                                    return (
                                      <Badge
                                        key={i}
                                        variant="outline"
                                        className={cn(
                                          'text-xs border',
                                          labelColorMap[color] || labelColorMap.gray
                                        )}
                                      >
                                        {text}
                                      </Badge>
                                    );
                                  })}
                                  {task.labels.length > 3 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{task.labels.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Footer */}
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  {task.dueDate && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>{formatDate(task.dueDate)}</span>
                                    </div>
                                  )}
                                  {task.estimatedHours && task.estimatedHours > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{task.estimatedHours}h</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  {task.assigneeIds && task.assigneeIds.length > 0 && (
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-xs">
                                        {task.assigneeIds.length > 1
                                          ? `+${task.assigneeIds.length}`
                                          : 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {/* Empty state */}
                    {columnTasks.length === 0 && (
                      <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                        No tasks
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
