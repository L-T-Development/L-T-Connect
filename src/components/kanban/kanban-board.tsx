'use client';

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Link as LinkIcon, User, Plus, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  wipLimit?: number;
  position: number;
}

interface Task {
  $id: string;
  title: string;
  description?: string;
  hierarchyId: string;
  status: string;
  priority: string;
  assigneeIds?: string[];
  labels?: string[];
  dueDate?: string;
  blockedBy?: string[];
  blocks?: string[];
  $createdAt: string;
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  tasks: Task[];
  onTaskMove: (taskId: string, newStatus: string, newPosition: number) => Promise<void>;
  onColumnSettings?: () => void;
}

export function KanbanBoard({ columns, tasks, onTaskMove, onColumnSettings }: KanbanBoardProps) {
  const [localTasks, setLocalTasks] = useState(tasks);

  // Sort columns by position
  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  const getTasksByColumn = (columnId: string) => {
    return localTasks.filter(task => task.status === columnId);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskId = draggableId;
    const newStatus = destination.droppableId;
    const newPosition = destination.index;

    // Optimistic update
    const updatedTasks = localTasks.map(t => {
      if (t.$id === taskId) {
        return { ...t, status: newStatus };
      }
      return t;
    });
    setLocalTasks(updatedTasks);

    try {
      await onTaskMove(taskId, newStatus, newPosition);
    } catch (error) {
      // Revert on error
      setLocalTasks(localTasks);
      console.error('Failed to move task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const isWIPLimitExceeded = (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (!column?.wipLimit) return false;
    const taskCount = getTasksByColumn(columnId).length;
    return taskCount > column.wipLimit;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Kanban Board</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Visualize work in progress with custom workflow columns
          </p>
        </div>
        <Button onClick={onColumnSettings} variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Manage Columns
        </Button>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
          {sortedColumns.map((column) => {
            const columnTasks = getTasksByColumn(column.id);
            const wipExceeded = isWIPLimitExceeded(column.id);

            return (
              <div key={column.id} className="flex-shrink-0 w-80">
                <Card className={`p-4 h-full border-t-4 ${column.color}`}>
                  {/* Column Header */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {column.title}
                        <Badge variant="secondary" className="ml-1">
                          {columnTasks.length}
                        </Badge>
                      </h3>
                      {column.wipLimit && (
                        <Badge
                          variant={wipExceeded ? 'destructive' : 'outline'}
                          className={wipExceeded ? 'animate-pulse' : ''}
                        >
                          WIP: {columnTasks.length}/{column.wipLimit}
                        </Badge>
                      )}
                    </div>
                    
                    {wipExceeded && (
                      <div className="bg-red-50 dark:bg-red-950 rounded p-2 text-xs text-red-700 dark:text-red-300 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        WIP limit exceeded!
                      </div>
                    )}
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-3 min-h-[500px] rounded-lg p-2 transition-colors ${
                          snapshot.isDraggingOver
                            ? 'bg-blue-50 dark:bg-blue-950 border-2 border-dashed border-blue-400'
                            : 'bg-gray-50 dark:bg-gray-900'
                        }`}
                      >
                        {columnTasks.map((task, index) => (
                          <Draggable key={task.$id} draggableId={task.$id} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 cursor-move hover:shadow-lg transition-shadow ${
                                  snapshot.isDragging
                                    ? 'rotate-2 shadow-2xl ring-2 ring-blue-400'
                                    : ''
                                }`}
                              >
                                {/* Task Header */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                    {task.hierarchyId}
                                  </span>
                                  <div
                                    className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(task.priority)}`}
                                    title={`${task.priority} priority`}
                                  />
                                </div>

                                {/* Task Title */}
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                                  {task.title}
                                </h4>

                                {/* Task Metadata */}
                                <div className="space-y-2">
                                  {/* Due Date */}
                                  {task.dueDate && (
                                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                                      <Calendar className="h-3 w-3" />
                                      <span>{formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}</span>
                                    </div>
                                  )}

                                  {/* Dependencies */}
                                  {(task.blockedBy?.length || task.blocks?.length) ? (
                                    <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                      <LinkIcon className="h-3 w-3" />
                                      <span>
                                        {task.blockedBy?.length ? `Blocked by ${task.blockedBy.length}` : ''}
                                        {task.blockedBy?.length && task.blocks?.length ? ' • ' : ''}
                                        {task.blocks?.length ? `Blocks ${task.blocks.length}` : ''}
                                      </span>
                                    </div>
                                  ) : null}

                                  {/* Assignees */}
                                  {task.assigneeIds && task.assigneeIds.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      {task.assigneeIds.slice(0, 3).map((_, idx) => (
                                        <Avatar key={idx} className="h-6 w-6">
                                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs">
                                            <User className="h-3 w-3" />
                                          </AvatarFallback>
                                        </Avatar>
                                      ))}
                                      {task.assigneeIds.length > 3 && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          +{task.assigneeIds.length - 3}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Labels */}
                                  {task.labels && task.labels.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {task.labels.slice(0, 2).map((label, idx) => (
                                        <Badge
                                          key={idx}
                                          variant="secondary"
                                          className="text-xs px-2 py-0"
                                        >
                                          {label}
                                        </Badge>
                                      ))}
                                      {task.labels.length > 2 && (
                                        <Badge variant="secondary" className="text-xs px-2 py-0">
                                          +{task.labels.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {/* Empty state */}
                        {columnTasks.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-600">
                            <Plus className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">Drop tasks here</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </Card>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
