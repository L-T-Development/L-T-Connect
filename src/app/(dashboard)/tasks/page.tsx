'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskBoard } from '@/components/task/task-board';
import { CreateTaskDialog } from '@/components/task/create-task-dialog';
import { TaskDetailsDialog } from '@/components/task/task-details-dialog';
import { EditTaskDialog } from '@/components/task/edit-task-dialog';
import { useTasks, useCreateTask, useUpdateTask, useUpdateTaskStatus, useDeleteTask } from '@/hooks/use-task';
import { useProjects } from '@/hooks/use-project';
import { useWorkspaces } from '@/hooks/use-workspace';
import { useAuth } from '@/components/providers/auth-provider';
import { useEpics } from '@/hooks/use-epic';
import { useFunctionalRequirements } from '@/hooks/use-functional-requirement';
import { Plus, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Task, TaskStatus } from '@/types';

export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { data: workspaces } = useWorkspaces(user?.$id);
  const currentWorkspace = workspaces?.[0]; // For now, use first workspace
  const projectIdFromUrl = searchParams.get('projectId');

  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(projectIdFromUrl || '');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [deleteTaskId, setDeleteTaskId] = React.useState<string | null>(null);

  const { data: projects } = useProjects(currentWorkspace?.$id);
  const { data: tasks = [], isLoading: isLoadingTasks } = useTasks(selectedProjectId || undefined);
  const { data: epics = [] } = useEpics(selectedProjectId || undefined);
  const { data: functionalRequirements = [] } = useFunctionalRequirements(selectedProjectId || undefined);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateTaskStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  // Restore project selection from localStorage or set from URL/first project
  React.useEffect(() => {
    const STORAGE_KEY = 'selected-project-id';
    
    // Priority: URL param > localStorage > first project
    if (projectIdFromUrl) {
      setSelectedProjectId(projectIdFromUrl);
      localStorage.setItem(STORAGE_KEY, projectIdFromUrl);
    } else {
      const savedProjectId = localStorage.getItem(STORAGE_KEY);
      
      if (savedProjectId && projects?.some(p => p.$id === savedProjectId)) {
        // Restore saved project if it still exists
        setSelectedProjectId(savedProjectId);
      } else if (projects && projects.length > 0 && !selectedProjectId) {
        // Default to first project if no saved selection
        const firstProjectId = projects[0].$id;
        setSelectedProjectId(firstProjectId);
        localStorage.setItem(STORAGE_KEY, firstProjectId);
      }
    }
  }, [projects, projectIdFromUrl, selectedProjectId]);

  const selectedProject = React.useMemo(() => {
    return projects?.find(p => p.$id === selectedProjectId);
  }, [projects, selectedProjectId]);

  // Extract all unique labels from existing tasks
  const existingLabels = React.useMemo(() => {
    const allLabels = new Set<string>();
    tasks.forEach(task => {
      if (task.labels && Array.isArray(task.labels)) {
        task.labels.forEach(label => allLabels.add(label));
      }
    });
    return Array.from(allLabels);
  }, [tasks]);

  // Filter tasks to show only those assigned to current user OR created by current user
  const myTasks = React.useMemo(() => {
    if (!user) return tasks;
    return tasks.filter(task => {
      const isAssignedToMe = task.assignedTo?.includes(user.$id) || false;
      const isCreatedByMe = task.createdBy === user.$id;
      return isAssignedToMe || isCreatedByMe;
    });
  }, [tasks, user]);

  const filteredTasks = React.useMemo(() => {
    if (!searchQuery) return myTasks;
    const query = searchQuery.toLowerCase();
    return myTasks.filter(
      task =>
        task.title.toLowerCase().includes(query) ||
        task.hierarchyId.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
    );
  }, [myTasks, searchQuery]);

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    localStorage.setItem('selected-project-id', projectId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('projectId', projectId);
    router.push(`/tasks?${params.toString()}`);
  };

  const handleCreateTask = async (values: any) => {
    if (!selectedProjectId || !selectedProject || !user || !currentWorkspace) return;

    await createTask.mutateAsync({
      workspaceId: currentWorkspace.$id,
      projectId: selectedProjectId,
      projectCode: selectedProject.shortCode,
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      createdBy: user.$id,
      dueDate: values.dueDate?.toISOString(),
      epicId: values.epicId && values.epicId !== 'none' ? values.epicId : undefined,
      functionalRequirementId: values.functionalRequirementId && values.functionalRequirementId !== 'none' ? values.functionalRequirementId : undefined,
      labels: values.labels || [],
    });

    setIsCreateDialogOpen(false);
  };

  const handleTaskMove = async (taskId: string, newStatus: TaskStatus, newPosition: number) => {
    if (!selectedProjectId) return;

    await updateTaskStatus.mutateAsync({
      taskId,
      projectId: selectedProjectId,
      status: newStatus,
      position: newPosition,
    });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailsDialogOpen(true);
  };

  const handleTaskEdit = (task: Task) => {
    setSelectedTask(task);
    setIsDetailsDialogOpen(false);
    setIsEditDialogOpen(true);
  };

  const handleTaskDelete = (taskId: string) => {
    setDeleteTaskId(taskId);
    setIsDetailsDialogOpen(false);
  };

  const handleEditTask = async (values: any) => {
    if (!selectedTask || !selectedProjectId) return;

    await updateTask.mutateAsync({
      taskId: selectedTask.$id,
      projectId: selectedProjectId,
      updates: {
        title: values.title,
        description: values.description,
        status: values.status,
        priority: values.priority,
        dueDate: values.dueDate?.toISOString(),
        epicId: values.epicId && values.epicId !== 'none' ? values.epicId : undefined,
        labels: values.labels || [],
      },
    });

    setIsEditDialogOpen(false);
    setSelectedTask(null);
  };

  const confirmDelete = async () => {
    if (!deleteTaskId || !selectedProjectId) return;

    await deleteTask.mutateAsync({
      taskId: deleteTaskId,
      projectId: selectedProjectId,
    });

    setDeleteTaskId(null);
  };

  if (!currentWorkspace) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Create a workspace first to manage tasks</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>No Workspace</CardTitle>
            <CardDescription>
              You need to create or join a workspace before you can manage tasks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/onboarding')}>
              Create Workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground">
          Tasks assigned to you or created by you ({myTasks.length} total)
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-full sm:w-64">
          <Select value={selectedProjectId || ''} onValueChange={handleProjectChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map(project => (
                <SelectItem key={project.$id} value={project.$id}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{project.shortCode}</span>
                    <span>{project.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 w-full sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => setIsCreateDialogOpen(true)} 
            disabled={!selectedProjectId}
            className="flex-1 sm:flex-none"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>

          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Task Board */}
      {selectedProjectId ? (
        isLoadingTasks ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          </div>
        ) : (
          <TaskBoard
            tasks={filteredTasks}
            projectId={selectedProjectId}
            onTaskMove={handleTaskMove}
            onTaskClick={handleTaskClick}
            onTaskEdit={handleTaskEdit}
            onTaskDelete={handleTaskDelete}
          />
        )
      ) : (
        <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">Select a Project</p>
            <p className="text-sm text-muted-foreground">
              Choose a project from the dropdown to view its tasks
            </p>
          </div>
        </div>
      )}

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateTask}
        isLoading={createTask.isPending}
        existingLabels={existingLabels}
        epics={epics}
        functionalRequirements={functionalRequirements}
      />

      {/* Task Details Dialog */}
      <TaskDetailsDialog
        task={selectedTask}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        onEdit={handleTaskEdit}
        onDelete={handleTaskDelete}
      />

      {/* Edit Task Dialog */}
      <EditTaskDialog
        task={selectedTask}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleEditTask}
        isLoading={updateTask.isPending}
        existingLabels={existingLabels}
        epics={epics}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
