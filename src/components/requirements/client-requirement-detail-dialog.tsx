'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar, User, FileText, Trash2, CheckCircle2, Clock, Archive, MessageSquare } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useClientRequirement, useUpdateClientRequirement, useDeleteClientRequirement } from '@/hooks/use-client-requirement';
import type { RequirementPriority, RequirementStatus } from '@/types';
import { CommentSection } from '@/components/comments/comment-section';

const statusConfig: Record<RequirementStatus, { label: string; icon: any; variant: any }> = {
  DRAFT: { label: 'Draft', icon: FileText, variant: 'secondary' },
  SUBMITTED: { label: 'Submitted', icon: Clock, variant: 'default' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, variant: 'default' },
  IN_PROGRESS: { label: 'In Progress', icon: Clock, variant: 'default' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, variant: 'default' },
  ARCHIVED: { label: 'Archived', icon: Archive, variant: 'secondary' },
};

const priorityConfig: Record<RequirementPriority, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'text-green-500' },
  MEDIUM: { label: 'Medium', color: 'text-yellow-500' },
  HIGH: { label: 'High', color: 'text-orange-500' },
  CRITICAL: { label: 'Critical', color: 'text-red-500' },
};

interface ClientRequirementDetailDialogProps {
  requirementId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function ClientRequirementDetailDialog({
  requirementId,
  open,
  onOpenChange,
  projectId,
}: ClientRequirementDetailDialogProps) {
  const { data: requirement } = useClientRequirement(requirementId || undefined);
  const updateRequirement = useUpdateClientRequirement();
  const deleteRequirement = useDeleteClientRequirement();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  if (!requirement) return null;

  const status = statusConfig[requirement.status];
  const priority = priorityConfig[requirement.priority];
  const StatusIcon = status.icon;

  const handleStatusChange = async (newStatus: RequirementStatus) => {
    await updateRequirement.mutateAsync({
      requirementId: requirement.$id,
      projectId,
      updates: { status: newStatus },
    });
  };

  const handlePriorityChange = async (newPriority: RequirementPriority) => {
    await updateRequirement.mutateAsync({
      requirementId: requirement.$id,
      projectId,
      updates: { priority: newPriority },
    });
  };

  const handleDelete = async () => {
    await deleteRequirement.mutateAsync({
      requirementId: requirement.$id,
      projectId,
    });
    setDeleteDialogOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={status.variant} className="flex items-center gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <span className={`text-lg ${priority.color}`}>●</span>
                    <span className="text-sm text-muted-foreground">{priority.label} Priority</span>
                  </div>
                </div>
                <DialogTitle className="text-2xl break-words">{requirement.title}</DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <Separator className="my-4" />

          {/* Main Content */}
          <div className="space-y-6 py-2">
            {/* Client Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Client
              </div>
              <p className="text-base">{requirement.clientName}</p>
            </div>

            <Separator />

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                Description
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {requirement.description}
              </p>
            </div>

            <Separator />

            {/* Status & Priority Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={requirement.status} onValueChange={(value) => handleStatusChange(value as RequirementStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={requirement.priority} onValueChange={(value) => handlePriorityChange(value as RequirementPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  Created
                </div>
                <p>{formatDate(requirement.$createdAt)}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  Last Updated
                </div>
                <p>{formatDate(requirement.$updatedAt)}</p>
              </div>
            </div>

            <Separator />

            {/* Comments Section */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-4">
                <MessageSquare className="h-4 w-4" />
                Comments
              </div>
              <CommentSection entityId={requirement.$id} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client Requirement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{requirement.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
