'use client';

import * as React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUpdateTask } from '@/hooks/use-task';
import { useFunctionalRequirement } from '@/hooks/use-functional-requirement';
import type { Task, TaskStatus } from '@/types';
import { cn } from '@/lib/utils';
import { 
  AlertCircle, 
  User,
  Calendar,
  Flag,
  Link2,
  FileText
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SprintBoardProps {
  tasks: Task[];
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'TODO', label: 'To Do', color: 'bg-slate-100 dark:bg-slate-900' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-50 dark:bg-blue-950' },
  { id: 'REVIEW', label: 'Review', color: 'bg-purple-50 dark:bg-purple-950' },
  { id: 'DONE', label: 'Done', color: 'bg-green-50 dark:bg-green-950' },
];

const priorityConfig = {
  CRITICAL: { label: 'Critical', color: 'bg-red-500', icon: AlertCircle },
  HIGH: { label: 'High', color: 'bg-orange-500', icon: Flag },
  MEDIUM: { label: 'Medium', color: 'bg-yellow-500', icon: Flag },
  LOW: { label: 'Low', color: 'bg-green-500', icon: Flag },
};

// ✅ Component to display FR badge for tasks linked to FRs
function TaskFRBadge({ functionalRequirementId }: { functionalRequirementId?: string }) {
  const { data: fr } = useFunctionalRequirement(functionalRequirementId);

  if (!functionalRequirementId || !fr) return null;

  return (
    <Badge 
      variant="secondary" 
      className="text-[10px] px-1.5 py-0 gap-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
    >
      <FileText className="h-2.5 w-2.5" />
      {fr.hierarchyId}
    </Badge>
  );
}

export function SprintBoard({ tasks }: SprintBoardProps) {
  const updateTask = useUpdateTask();
  const [localTasks, setLocalTasks] = React.useState(tasks);

  React.useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const getTasksByColumn = (columnId: TaskStatus) => {
    return localTasks
      .filter(task => task.status === columnId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside the list
    if (!destination) return;

    // No change
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const task = localTasks.find(t => t.$id === draggableId);
    if (!task) return;

    const newStatus = destination.droppableId as TaskStatus;

    // Optimistic update
    const updatedTasks = localTasks.map(t => {
      if (t.$id === draggableId) {
        return { ...t, status: newStatus };
      }
      return t;
    });
    setLocalTasks(updatedTasks);

    // Update in database
    try {
      await updateTask.mutateAsync({
        taskId: task.$id,
        projectId: task.projectId,
        updates: {
          status: newStatus,
          position: destination.index,
        },
      });
    } catch (error) {
      // Revert on error
      setLocalTasks(localTasks);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(column => {
          const columnTasks = getTasksByColumn(column.id);

          return (
            <div key={column.id} className="flex flex-col">
              <div className={cn("p-4 rounded-t-lg border-t-4", column.color)}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{column.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {columnTasks.length}
                  </Badge>
                </div>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 p-2 space-y-2 rounded-b-lg border border-t-0 min-h-[500px] transition-colors",
                      snapshot.isDraggingOver ? 'bg-accent/50 border-primary' : 'bg-background'
                    )}
                  >
                    {columnTasks.map((task, index) => (
                      <Draggable
                        key={task.$id}
                        draggableId={task.$id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "cursor-grab active:cursor-grabbing transition-all",
                              snapshot.isDragging && "shadow-lg ring-2 ring-primary rotate-2"
                            )}
                          >
                            <CardContent className="p-3 space-y-2">
                              {/* Task ID and Priority */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {task.hierarchyId}
                                  </Badge>
                                  {/* ✅ FR Badge for tasks linked to FRs */}
                                  <TaskFRBadge functionalRequirementId={task.functionalRequirementId} />
                                </div>
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  priorityConfig[task.priority].color
                                )} />
                              </div>

                              {/* Task Title */}
                              <h4 className="text-sm font-medium line-clamp-2 leading-tight">
                                {task.title}
                              </h4>

                              {/* Metadata */}
                              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                {task.dueDate && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}</span>
                                  </div>
                                )}

                                {(task.blockedBy?.length > 0 || task.blocks?.length > 0) && (
                                  <div className="flex items-center gap-1 text-orange-500">
                                    <Link2 className="h-3 w-3" />
                                    <span>{(task.blockedBy?.length || 0) + (task.blocks?.length || 0)}</span>
                                  </div>
                                )}
                              </div>

                              {/* Assignees */}
                              {task.assigneeIds && task.assigneeIds.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <div className="flex -space-x-1">
                                    {task.assigneeIds.slice(0, 3).map((assigneeId, idx) => (
                                      <Avatar key={idx} className="h-5 w-5 border-2 border-background">
                                        <AvatarFallback className="text-[8px]">
                                          {assigneeId.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                    {task.assigneeIds.length > 3 && (
                                      <Avatar className="h-5 w-5 border-2 border-background">
                                        <AvatarFallback className="text-[8px]">
                                          +{task.assigneeIds.length - 3}
                                        </AvatarFallback>
                                      </Avatar>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Labels */}
                              {task.labels && task.labels.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {task.labels.slice(0, 2).map((label, idx) => (
                                    <Badge key={idx} variant="outline" className="text-[10px] px-1 py-0">
                                      {label.split(':')[1] || label}
                                    </Badge>
                                  ))}
                                  {task.labels.length > 2 && (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                                      +{task.labels.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {columnTasks.length === 0 && (
                      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                        Drop tasks here
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
