'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Loader2,
  Trash2,
  Save,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Task, TaskPriority } from '@/types';

interface TaskTemplate {
  $id: string;
  workspaceId: string;
  projectId?: string; // Optional - can be workspace-wide
  name: string;
  description?: string;
  priority: TaskPriority;
  estimatedHours?: number;
  labels: string[];
  subtaskTitles: string[]; // Array of subtask titles to create
  $createdAt: string;
}

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  onSave: (templateName: string) => Promise<void>;
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  task,
  onSave,
}: SaveAsTemplateDialogProps) {
  const [templateName, setTemplateName] = useState(`${task.title} Template`);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for the template',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(templateName.trim());
      toast({
        title: 'Template saved',
        description: 'Task template has been saved successfully',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Save this task as a reusable template. The template will include the task structure but not specific data like assignees or dates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Bug Fix Template"
            />
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm font-medium">Template will include:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Task title and description structure</li>
              <li>✓ Priority level ({task.priority})</li>
              <li>✓ Estimated hours ({task.estimatedHours || 'none'})</li>
              <li>✓ Labels ({task.labels.length})</li>
              <li>✓ Subtask structure (if any)</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TemplateLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: TaskTemplate[];
  onSelectTemplate: (template: TaskTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
}

export function TemplateLibraryDialog({
  open,
  onOpenChange,
  templates,
  onSelectTemplate,
  onDeleteTemplate,
}: TemplateLibraryDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Task Templates
          </DialogTitle>
          <DialogDescription>
            Choose a template to create a new task quickly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <ScrollArea className="h-[400px] pr-4">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No templates found' : 'No templates yet. Save a task as a template to get started.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.$id}
                    className="flex items-start gap-3 p-4 rounded-lg border hover:border-primary transition-colors cursor-pointer"
                    onClick={() => {
                      onSelectTemplate(template);
                      onOpenChange(false);
                    }}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          {template.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {template.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {template.priority}
                        </Badge>
                        {template.subtaskTitles.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {template.subtaskTitles.length} subtasks
                          </Badge>
                        )}
                        {template.labels.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {template.labels.length} labels
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this template?')) {
                          onDeleteTemplate(template.$id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Button to open template library
interface CreateFromTemplateButtonProps {
  onClick: () => void;
  templateCount: number;
}

export function CreateFromTemplateButton({ onClick, templateCount }: CreateFromTemplateButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="gap-2"
      disabled={templateCount === 0}
    >
      <Sparkles className="h-4 w-4" />
      From Template
      {templateCount > 0 && (
        <Badge variant="secondary" className="ml-1">
          {templateCount}
        </Badge>
      )}
    </Button>
  );
}

// Export types
export type { TaskTemplate };
