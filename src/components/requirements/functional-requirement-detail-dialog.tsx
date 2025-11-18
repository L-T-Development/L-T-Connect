'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trash2, Link as LinkIcon, MessageSquare, UserPlus, X, Calendar, Copy } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUpdateFunctionalRequirement, useDeleteFunctionalRequirement, useCloneFunctionalRequirement } from '@/hooks/use-functional-requirement';
import { useTeamMembers } from '@/hooks/use-team';
import { useSprints } from '@/hooks/use-sprint';
import { useProjects } from '@/hooks/use-project';
import type { FunctionalRequirement, ClientRequirement } from '@/types';
import { CommentSection } from '@/components/comments/comment-section';

const statusConfig: Record<FunctionalRequirement['status'], { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-500' },
  REVIEW: { label: 'In Review', color: 'bg-yellow-500' },
  APPROVED: { label: 'Approved', color: 'bg-blue-500' },
  IMPLEMENTED: { label: 'Implemented', color: 'bg-purple-500' },
  TESTED: { label: 'Tested', color: 'bg-indigo-500' },
  DEPLOYED: { label: 'Deployed', color: 'bg-green-500' },
};

// Note: 'type' field removed from FunctionalRequirement interface
// const typeConfig: Record<FunctionalRequirement['type'], { label: string; color: string }> = {
//   FUNCTIONAL: { label: 'Functional', color: 'blue' },
//   NON_FUNCTIONAL: { label: 'Non-Functional', color: 'purple' },
//   TECHNICAL: { label: 'Technical', color: 'orange' },
//   BUSINESS: { label: 'Business', color: 'green' },
// };

const complexityConfig: Record<FunctionalRequirement['complexity'], { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'green' },
  MEDIUM: { label: 'Medium', color: 'yellow' },
  HIGH: { label: 'High', color: 'orange' },
  VERY_HIGH: { label: 'Very High', color: 'red' },
};

interface FunctionalRequirementDetailDialogProps {
  requirement: FunctionalRequirement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  workspaceId: string;
  clientRequirements: ClientRequirement[];
}

export function FunctionalRequirementDetailDialog({
  requirement,
  open,
  onOpenChange,
  projectId,
  workspaceId,
  clientRequirements,
}: FunctionalRequirementDetailDialogProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState<string>('');
  const updateRequirement = useUpdateFunctionalRequirement();
  const deleteRequirement = useDeleteFunctionalRequirement();
  const cloneRequirement = useCloneFunctionalRequirement();
  const { toast } = useToast();
  
  // Load workspace members and sprints
  const { data: members = [] } = useTeamMembers(workspaceId);
  const { data: sprints = [] } = useSprints(projectId);
  const { data: projects = [] } = useProjects(workspaceId);

  const handleSprintAssignment = async (sprintId: string) => {
    await updateRequirement.mutateAsync({
      requirementId: requirement.$id,
      projectId,
      updates: { sprintId: sprintId === 'none' ? '' : sprintId },
      previousSprintId: requirement.sprintId || undefined, // ✅ Track previous sprint
    });
  };

  const handleAddTeamMember = async (userId: string) => {
    const member = members.find(m => m.userId === userId);
    if (!member) return;

    const currentAssignedTo = requirement.assignedTo || [];
    const currentAssignedToNames = requirement.assignedToNames || [];

    if (currentAssignedTo.includes(userId)) return; // Already assigned

    await updateRequirement.mutateAsync({
      requirementId: requirement.$id,
      projectId,
      updates: {
        assignedTo: [...currentAssignedTo, userId],
        assignedToNames: [...currentAssignedToNames, member.name || member.email || 'Unknown'],
      },
    });
  };

  const handleRemoveTeamMember = async (userId: string) => {
    const currentAssignedTo = requirement.assignedTo || [];
    const currentAssignedToNames = requirement.assignedToNames || [];

    const index = currentAssignedTo.indexOf(userId);
    if (index === -1) return;

    const newAssignedTo = currentAssignedTo.filter(id => id !== userId);
    const newAssignedToNames = [...currentAssignedToNames];
    newAssignedToNames.splice(index, 1);

    await updateRequirement.mutateAsync({
      requirementId: requirement.$id,
      projectId,
      updates: {
        assignedTo: newAssignedTo,
        assignedToNames: newAssignedToNames,
      },
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

  const handleClone = async () => {
    if (!selectedProject) {
      toast({
        title: 'Error',
        description: 'Please select a target project',
        variant: 'destructive',
      });
      return;
    }

    const targetProj = projects.find(p => p.$id === selectedProject);
    if (!targetProj) return;

    await cloneRequirement.mutateAsync({
      requirementId: requirement.$id,
      targetProjectId: selectedProject,
      targetProjectCode: targetProj.shortCode,
      targetEpicId: undefined, // User can move to epic later
      targetClientRequirementId: undefined,
    });

    setCloneDialogOpen(false);
    setSelectedProject('');
  };

  const complexity = complexityConfig[requirement.complexity];
  const linkedClientReq = clientRequirements.find(cr => cr.$id === requirement.clientRequirementId);
  
  // Get unassigned members - check using userId field
  const assignedIds = requirement.assignedTo || [];
  const unassignedMembers = members.filter(m => !assignedIds.includes(m.userId));
  
  // Get assigned sprint name
  const assignedSprint = sprints.find(s => s.$id === requirement.sprintId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {requirement.hierarchyId}
                  </Badge>
                  {requirement.reusable && (
                    <Badge variant="secondary">Reusable</Badge>
                  )}
                </div>
                <DialogTitle className="text-2xl">{requirement.title}</DialogTitle>
                {requirement.description && (
                  <DialogDescription className="text-base">
                    {requirement.description}
                  </DialogDescription>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCloneDialogOpen(true)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  title="Clone to another project"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status - Auto-calculated from tasks, read-only */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 rounded-md">
                <div className={`w-2 h-2 rounded-full ${statusConfig[requirement.status].color}`} />
                <span className="text-sm">{statusConfig[requirement.status].label}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  (Auto-calculated from tasks)
                </span>
              </div>
            </div>

            <Separator />

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Note: 'type' field removed from FunctionalRequirement interface */}
              {/* <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <div className="mt-1">
                  <Badge variant="outline" className={`bg-${type.color}-500/10`}>
                    {type.label}
                  </Badge>
                </div>
              </div> */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Priority</label>
                <div className="mt-1">
                  <Badge variant="outline">{requirement.priority}</Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Complexity</label>
                <div className="mt-1">
                  <Badge variant="outline" className={`bg-${complexity.color}-500/10`}>
                    {complexity.label}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Sprint Assignment */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Assign to Sprint
              </label>
              <Select 
                value={requirement.sprintId || 'none'} 
                onValueChange={handleSprintAssignment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No sprint assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No sprint</SelectItem>
                  {sprints.map((sprint) => (
                    <SelectItem key={sprint.$id} value={sprint.$id}>
                      {sprint.name} ({sprint.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignedSprint && (
                <p className="text-sm text-muted-foreground">
                  Currently in: {assignedSprint.name}
                </p>
              )}
            </div>

            <Separator />

            {/* Team Assignment */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Assigned Team Members
              </label>
              
              {/* Assigned Members */}
              {assignedIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {assignedIds.map((userId, index) => {
                    const member = members.find(m => m.userId === userId);
                    const memberName = requirement.assignedToNames?.[index] || member?.name || member?.email || 'Unknown';
                    const initials = memberName
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <div
                        key={userId}
                        className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{memberName}</span>
                        <button
                          onClick={() => handleRemoveTeamMember(userId)}
                          className="hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Member Dropdown */}
              {unassignedMembers.length > 0 ? (
                <Select onValueChange={handleAddTeamMember}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedMembers.map((member) => (
                      <SelectItem key={member.$id} value={member.userId}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {member.name
                                ? member.name
                                    .split(' ')
                                    .map(n => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2)
                                : member.email?.slice(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          {member.name || member.email}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : assignedIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team members available</p>
              ) : (
                <p className="text-sm text-muted-foreground">All members assigned</p>
              )}
            </div>

            <Separator />

            {/* Linked Client Requirement */}
            {linkedClientReq && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Linked Client Requirement
                  </label>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">{linkedClientReq.title}</div>
                    {linkedClientReq.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {linkedClientReq.description}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{linkedClientReq.priority}</Badge>
                      <Badge className={`bg-${linkedClientReq.status === 'APPROVED' ? 'green' : 'gray'}-500`}>
                        {linkedClientReq.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Note: acceptanceCriteria, businessRules, tags fields removed from FunctionalRequirement type */}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>
                <div>Created</div>
                <div className="font-medium text-foreground">
                  {formatDate(requirement.$createdAt)}
                </div>
              </div>
              <div>
                <div>Last Updated</div>
                <div className="font-medium text-foreground">
                  {formatDate(requirement.$updatedAt)}
                </div>
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Functional Requirement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{requirement.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clone to Project Dialog */}
      <AlertDialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clone Functional Requirement</AlertDialogTitle>
            <AlertDialogDescription>
              Clone "{requirement.hierarchyId}" to another project. The FR will be duplicated with a new hierarchy ID.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Target Project</label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                {projects
                  .filter(p => p.$id !== projectId) // Exclude current project
                  .map(project => (
                    <SelectItem key={project.$id} value={project.$id}>
                      {project.shortCode} - {project.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedProject('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClone}
              disabled={!selectedProject}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Clone FR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
