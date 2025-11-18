'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { GripVertical, Plus, Trash2, Edit2, Save, X, RotateCcw } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useToast } from '@/hooks/use-toast';

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  wipLimit?: number;
  position: number;
}

interface ColumnManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: KanbanColumn[];
  onSave: (columns: KanbanColumn[]) => Promise<void>;
}

const PRESET_COLORS = [
  'border-t-gray-500',
  'border-t-red-500',
  'border-t-orange-500',
  'border-t-yellow-500',
  'border-t-green-500',
  'border-t-blue-500',
  'border-t-indigo-500',
  'border-t-purple-500',
  'border-t-pink-500',
];

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'backlog', title: 'Backlog', color: 'border-t-gray-500', position: 0 },
  { id: 'todo', title: 'To Do', color: 'border-t-blue-500', position: 1 },
  { id: 'in-progress', title: 'In Progress', color: 'border-t-yellow-500', position: 2, wipLimit: 5 },
  { id: 'review', title: 'Review', color: 'border-t-purple-500', position: 3 },
  { id: 'done', title: 'Done', color: 'border-t-green-500', position: 4 },
];

export function ColumnManagement({ open, onOpenChange, columns, onSave }: ColumnManagementProps) {
  const { toast } = useToast();
  const [localColumns, setLocalColumns] = useState<KanbanColumn[]>(columns);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(localColumns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index,
    }));

    setLocalColumns(updatedItems);
  };

  const addColumn = () => {
    const newColumn: KanbanColumn = {
      id: `column_${Date.now()}`,
      title: 'New Column',
      color: 'border-t-gray-500',
      position: localColumns.length,
    };
    setLocalColumns([...localColumns, newColumn]);
    setEditingId(newColumn.id);
  };

  const deleteColumn = (columnId: string) => {
    if (localColumns.length <= 2) {
      toast({
        title: 'Cannot delete',
        description: 'You must have at least 2 columns',
        variant: 'destructive',
      });
      return;
    }

    setLocalColumns(localColumns.filter(c => c.id !== columnId));
  };

  const updateColumn = (columnId: string, updates: Partial<KanbanColumn>) => {
    setLocalColumns(localColumns.map(c => 
      c.id === columnId ? { ...c, ...updates } : c
    ));
  };

  const resetToDefaults = () => {
    if (confirm('Reset to default columns? This will replace your current configuration.')) {
      setLocalColumns(DEFAULT_COLUMNS);
      toast({
        title: 'Reset to defaults',
        description: 'Column configuration has been reset',
      });
    }
  };

  const handleSave = async () => {
    // Validation
    if (localColumns.some(c => !c.title.trim())) {
      toast({
        title: 'Invalid columns',
        description: 'All columns must have a title',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(localColumns);
      toast({
        title: 'Columns saved',
        description: 'Your Kanban board has been updated',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save columns:', error);
      toast({
        title: 'Error',
        description: 'Failed to save column configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Kanban Columns</DialogTitle>
          <DialogDescription>
            Customize your workflow by adding, editing, reordering, or removing columns.
            Drag to reorder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Actions */}
          <div className="flex justify-between gap-2">
            <Button onClick={addColumn} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Column
            </Button>
            <Button onClick={resetToDefaults} variant="ghost" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>

          {/* Column List */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="columns">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2"
                >
                  {localColumns.map((column, index) => (
                    <Draggable key={column.id} draggableId={column.id} index={index}>
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`p-4 ${snapshot.isDragging ? 'shadow-lg rotate-1' : ''} ${column.color} border-t-4`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Drag Handle */}
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-move pt-2 text-gray-400 hover:text-gray-600"
                            >
                              <GripVertical className="h-5 w-5" />
                            </div>

                            {/* Column Content */}
                            <div className="flex-1 space-y-3">
                              {editingId === column.id ? (
                                // Edit Mode
                                <>
                                  <div className="space-y-2">
                                    <Label htmlFor={`title-${column.id}`}>Column Title</Label>
                                    <Input
                                      id={`title-${column.id}`}
                                      value={column.title}
                                      onChange={(e) => updateColumn(column.id, { title: e.target.value })}
                                      placeholder="Enter column title"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor={`wip-${column.id}`}>WIP Limit (optional)</Label>
                                    <Input
                                      id={`wip-${column.id}`}
                                      type="number"
                                      min="0"
                                      value={column.wipLimit || ''}
                                      onChange={(e) => updateColumn(column.id, { 
                                        wipLimit: e.target.value ? parseInt(e.target.value) : undefined 
                                      })}
                                      placeholder="No limit"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Column Color</Label>
                                    <div className="flex gap-2 flex-wrap">
                                      {PRESET_COLORS.map((color) => (
                                        <button
                                          key={color}
                                          onClick={() => updateColumn(column.id, { color })}
                                          className={`w-10 h-10 rounded-lg border-4 ${color} ${
                                            column.color === color
                                              ? 'ring-2 ring-blue-500 ring-offset-2'
                                              : 'hover:scale-110'
                                          } transition-transform`}
                                          title={color}
                                        />
                                      ))}
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => setEditingId(null)}
                                    >
                                      <Save className="h-4 w-4 mr-2" />
                                      Done
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingId(null)}
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Cancel
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                // View Mode
                                <>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                        {column.title}
                                      </h4>
                                      {column.wipLimit && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                          WIP Limit: {column.wipLimit}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingId(column.id)}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => deleteColumn(column.id)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Preview */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Preview
            </h4>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {localColumns.map((column) => (
                <div
                  key={column.id}
                  className={`flex-shrink-0 w-32 h-20 rounded-lg border-t-4 ${column.color} bg-gray-50 dark:bg-gray-900 p-2`}
                >
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                    {column.title}
                  </p>
                  {column.wipLimit && (
                    <p className="text-xs text-gray-500 mt-1">
                      WIP: {column.wipLimit}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
