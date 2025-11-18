'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Layers, User, Flag, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';

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
}

interface SwimlaneViewProps {
  tasks: Task[];
  columns: Array<{ id: string; title: string }>;
  groupBy: 'assignee' | 'priority' | 'epic';
  onGroupByChange: (value: 'assignee' | 'priority' | 'epic') => void;
}

export function SwimlaneView({ tasks, columns, groupBy, onGroupByChange }: SwimlaneViewProps) {
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());

  const toggleLane = (laneId: string) => {
    const newCollapsed = new Set(collapsedLanes);
    if (newCollapsed.has(laneId)) {
      newCollapsed.delete(laneId);
    } else {
      newCollapsed.add(laneId);
    }
    setCollapsedLanes(newCollapsed);
  };

  const getGroupedTasks = () => {
    const groups: Map<string, Task[]> = new Map();

    tasks.forEach(task => {
      let key: string;
      switch (groupBy) {
        case 'assignee':
          key = task.assigneeIds?.[0] || 'unassigned';
          break;
        case 'priority':
          key = task.priority || 'NONE';
          break;
        case 'epic':
          // Tasks don't have epicId directly - would need FR lookup
          key = 'no-epic';
          break;
        default:
          key = 'other';
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(task);
    });

    return groups;
  };

  const getLaneTitle = (key: string) => {
    switch (groupBy) {
      case 'assignee':
        return key === 'unassigned' ? 'Unassigned' : `User ${key}`;
      case 'priority':
        return key.charAt(0) + key.slice(1).toLowerCase();
      case 'epic':
        return key === 'no-epic' ? 'No Epic' : `Epic ${key}`;
      default:
        return key;
    }
  };

  const getLaneIcon = () => {
    switch (groupBy) {
      case 'assignee':
        return <User className="h-4 w-4" />;
      case 'priority':
        return <Flag className="h-4 w-4" />;
      case 'epic':
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getLaneColor = (key: string) => {
    switch (groupBy) {
      case 'priority':
        switch (key) {
          case 'CRITICAL': return 'bg-red-100 dark:bg-red-950 border-red-300';
          case 'HIGH': return 'bg-orange-100 dark:bg-orange-950 border-orange-300';
          case 'MEDIUM': return 'bg-yellow-100 dark:bg-yellow-950 border-yellow-300';
          case 'LOW': return 'bg-green-100 dark:bg-green-950 border-green-300';
          default: return 'bg-gray-100 dark:bg-gray-900 border-gray-300';
        }
      default:
        return 'bg-gray-50 dark:bg-gray-900 border-gray-200';
    }
  };

  const groupedTasks = getGroupedTasks();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Swimlanes View
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Group by:</span>
          <Select value={groupBy} onValueChange={onGroupByChange as any}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assignee">Assignee</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="epic">Epic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Swimlanes */}
      <div className="space-y-3">
        {Array.from(groupedTasks.entries()).map(([laneKey, laneTasks]) => {
          const isCollapsed = collapsedLanes.has(laneKey);
          
          return (
            <Card key={laneKey} className={`overflow-hidden ${getLaneColor(laneKey)}`}>
              {/* Lane Header */}
              <button
                onClick={() => toggleLane(laneKey)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                  
                  {getLaneIcon()}
                  
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    {getLaneTitle(laneKey)}
                  </h4>
                  
                  <Badge variant="secondary">
                    {laneTasks.length} tasks
                  </Badge>
                </div>
              </button>

              {/* Lane Content */}
              {!isCollapsed && (
                <div className="p-4 bg-white dark:bg-gray-800">
                  <div className="overflow-x-auto">
                    <div className="flex gap-4 min-w-max">
                      {columns.map(column => {
                        const columnTasks = laneTasks.filter(t => t.status === column.id);
                        
                        return (
                          <div key={column.id} className="w-64 flex-shrink-0">
                            <div className="mb-2 flex items-center justify-between">
                              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {column.title}
                              </h5>
                              <Badge variant="outline" className="text-xs">
                                {columnTasks.length}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2">
                              {columnTasks.map(task => (
                                <Card key={task.$id} className="p-3 hover:shadow-md transition-shadow">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <span className="text-xs font-mono text-gray-500">
                                      {task.hierarchyId}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                                    {task.title}
                                  </p>
                                </Card>
                              ))}
                              
                              {columnTasks.length === 0 && (
                                <div className="text-center text-sm text-gray-400 dark:text-gray-600 py-8">
                                  No tasks
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {groupedTasks.size === 0 && (
        <Card className="p-12 text-center">
          <Layers className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No tasks to display</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Add tasks to see them organized in swimlanes
          </p>
        </Card>
      )}
    </div>
  );
}
