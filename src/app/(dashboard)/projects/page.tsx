'use client';

import * as React from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useProjects, useDeleteProject, useUpdateProject, useCloneProject } from '@/hooks/use-project';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { useWorkspaceTasks } from '@/hooks/use-task';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { CreateProjectDialog } from '@/components/project/create-project-dialog';
import { EditProjectDialog } from '@/components/project/edit-project-dialog';
import { CloneProjectDialog } from '@/components/project/clone-project-dialog';
import type { CloneProjectData } from '@/components/project/clone-project-dialog';
import { ProjectHealthBadge } from '@/components/projects/project-health-badge';
import { calculateProjectHealth } from '@/lib/project-health';
import { MoreVertical, Settings, Trash2, Calendar, Users, GitBranch, Kanban, Edit, Copy } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { ProjectStatus, Project } from '@/types';
import { useHasPermission, useIsAdmin } from '@/hooks/use-permissions';
import { Permission } from '@/lib/permissions';

const statusConfig: Record<ProjectStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  PLANNING: { label: 'Planning', variant: 'outline' },
  ACTIVE: { label: 'Active', variant: 'success' },
  ON_HOLD: { label: 'On Hold', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'info' },
  ARCHIVED: { label: 'Archived', variant: 'secondary' },
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { currentWorkspace, isLoading: workspacesLoading } = useCurrentWorkspace();
  const { data: projects, isLoading: projectsLoading } = useProjects(currentWorkspace?.$id);
  const { data: allTasks } = useWorkspaceTasks(currentWorkspace?.$id);
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const cloneProject = useCloneProject();

  // Permission checks
  const canEditProject = useHasPermission(Permission.EDIT_PROJECT);
  const canDeleteProject = useHasPermission(Permission.DELETE_PROJECT);
  const canManageSettings = useHasPermission(Permission.MANAGE_PROJECT_SETTINGS);
  const canCreateProject = useHasPermission(Permission.CREATE_PROJECT);
  const isAdmin = useIsAdmin();

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = React.useState<{ projectId: string; workspaceId: string } | null>(null);

  // Filter out archived projects completely
  const filteredProjects = React.useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => !p.archived);
  }, [projects]);

  const handleEdit = async (values: any) => {
    if (!selectedProject || !currentWorkspace) return;

    await updateProject.mutateAsync({
      projectId: selectedProject.$id,
      workspaceId: currentWorkspace.$id,
      name: values.name,
      description: values.description,
      status: values.status,
      startDate: values.startDate?.toISOString(),
      endDate: values.endDate?.toISOString(),
    });

    setEditDialogOpen(false);
    setSelectedProject(null);
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;

    await deleteProject.mutateAsync(projectToDelete);
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  const handleClone = async (cloneData: CloneProjectData) => {
    if (!selectedProject || !user) return;

    await cloneProject.mutateAsync({
      sourceProjectId: selectedProject.$id,
      newName: cloneData.name,
      includeSettings: cloneData.includeSettings,
      includeTasks: cloneData.includeTasks,
      includeMembers: cloneData.includeMembers,
      includeSprints: cloneData.includeSprints,
      userId: user.$id,
    });

    setCloneDialogOpen(false);
    setSelectedProject(null);
  };

  // Show loading state
  if (workspacesLoading || projectsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Create a workspace first to manage projects</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>No Workspace</CardTitle>
            <CardDescription>
              You need to create or join a workspace before you can create projects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/workspaces')}>Go to Workspaces</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your projects in {currentWorkspace.name}
          </p>
        </div>
        {canCreateProject && <CreateProjectDialog workspaceId={currentWorkspace.$id} />}
      </div>

      {filteredProjects && filteredProjects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const status = statusConfig[project.status];
            const projectTasks = allTasks?.filter(t => t.projectId === project.$id) || [];
            const health = calculateProjectHealth(project, allTasks || []);

            return (
              <Card key={project.$id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="font-mono">
                          {project.shortCode}
                        </Badge>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {projectTasks.length > 0 && (
                          <ProjectHealthBadge score={health.score} showLabel={false} size="sm" />
                        )}
                      </div>
                      <CardTitle className="text-xl">{project.name}</CardTitle>
                      <CardDescription className="mt-1.5 line-clamp-2">
                        {project.description || 'No description'}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEditProject && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedProject(project);
                              setEditDialogOpen(true);
                            }}
                            className="cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Project
                          </DropdownMenuItem>
                        )}
                        {canManageSettings && (
                          <DropdownMenuItem
                            onClick={() => router.push(`/projects/${project.$id}/settings`)}
                            className="cursor-pointer"
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedProject(project);
                              setCloneDialogOpen(true);
                            }}
                            className="cursor-pointer"
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Clone Project
                          </DropdownMenuItem>
                        )}
                        {(canEditProject || canDeleteProject) && <DropdownMenuSeparator />}
                        {canDeleteProject && (
                          <DropdownMenuItem
                            onClick={() => {
                              setProjectToDelete({ projectId: project.$id, workspaceId: project.workspaceId });
                              setDeleteDialogOpen(true);
                            }}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    {project.methodology === 'SCRUM' ? (
                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <GitBranch className="h-4 w-4" />
                        <span>Scrum</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                        <Kanban className="h-4 w-4" />
                        <span>Kanban</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>Team</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{project.startDate ? formatDate(project.startDate) : 'Not set'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      onClick={() => router.push(`/projects/${project.$id}`)}
                      className="flex-1"
                    >
                      View Project
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Projects</CardTitle>
            <CardDescription>
              Create your first project to start organizing tasks and sprints.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateProjectDialog workspaceId={currentWorkspace.$id} />
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project and all associated tasks, sprints, and
              requirements. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProject.isPending ? 'Deleting...' : 'Delete Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Project Dialog */}
      <EditProjectDialog
        project={selectedProject}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleEdit}
        isLoading={updateProject.isPending}
      />

      {/* Clone Project Dialog */}
      <CloneProjectDialog
        project={selectedProject}
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
        onClone={handleClone}
        isLoading={cloneProject.isPending}
      />
    </div>
  );
}
