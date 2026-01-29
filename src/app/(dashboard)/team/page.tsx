'use client';

import * as React from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { useWorkspaceTasks } from '@/hooks/use-task';
import {
  useTeamMembers,
  useUpdateTeamMember,
  useDeleteTeamMember,
  useMemberTaskCounts,
  getWorkloadLevel,
  ROLE_CONFIG,
  STATUS_CONFIG,
  TeamMember,
} from '@/hooks/use-team';
import { useHasPermission } from '@/hooks/use-permissions';
import { Permission } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Users, Search, MoreVertical, Mail, Phone, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { ResourceAllocationCard } from '@/components/team/resource-allocation-card';
import { AddMembersSection } from '@/components/team/add-members-section';
import { DeleteMemberDialog } from '@/components/team/delete-member-dialog';
import { calculateTeamWorkload } from '@/lib/team-workload';
import { addDays } from 'date-fns';

export default function TeamPage() {
  const { user } = useAuth();
  const { currentWorkspace, isLoading: workspacesLoading } = useCurrentWorkspace();

  const { data: teamMembers = [], isLoading: membersLoading } = useTeamMembers(
    currentWorkspace?.$id
  );
  const { data: tasks } = useWorkspaceTasks(currentWorkspace?.$id);
  const { data: taskCounts } = useMemberTaskCounts(currentWorkspace?.$id);
  const updateMember = useUpdateTeamMember();
  const deleteMember = useDeleteTeamMember();

  // Check if user has permission to invite members
  const canInviteMembers = useHasPermission(Permission.INVITE_MEMBER);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedRole, setSelectedRole] = React.useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('ALL');
  const [editingMember, setEditingMember] = React.useState<TeamMember | null>(null);
  const [memberToDelete, setMemberToDelete] = React.useState<TeamMember | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  // Filter team members
  const filteredMembers = React.useMemo(() => {
    return teamMembers.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = selectedRole === 'ALL' || member.role === selectedRole;
      const matchesStatus = selectedStatus === 'ALL' || member.status === selectedStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [teamMembers, searchQuery, selectedRole, selectedStatus]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const totalMembers = teamMembers.length;
    const activeMembers = teamMembers.filter((m) => m.status === 'ACTIVE').length;
    const roleBreakdown = teamMembers.reduce(
      (acc, member) => {
        acc[member.role] = (acc[member.role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return { totalMembers, activeMembers, roleBreakdown };
  }, [teamMembers]);

  // Calculate team workload (next 14 days)
  const workloadData = React.useMemo(() => {
    if (!tasks || !teamMembers) return null;

    const startDate = new Date();
    const endDate = addDays(startDate, 14);

    return calculateTeamWorkload(tasks, teamMembers, startDate, endDate);
  }, [tasks, teamMembers]);

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setIsEditDialogOpen(true);
  };

  const handleUpdateMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMember) return;

    const formData = new FormData(e.currentTarget);
    const updates = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: (formData.get('phone') as string) || undefined,
      role: formData.get('role') as TeamMember['role'],
      status: formData.get('status') as TeamMember['status'],
    };

    try {
      await updateMember.mutateAsync({
        id: editingMember.$id,
        data: updates,
      });

      toast.success('Team member updated successfully');
      setIsEditDialogOpen(false);
      setEditingMember(null);
    } catch (error) {
      toast.error('Failed to update team member');
      console.error(error);
    }
  };

  const handleDeleteMember = (member: TeamMember) => {
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;

    try {
      await deleteMember.mutateAsync({
        id: memberToDelete.$id,
        workspaceId: memberToDelete.workspaceId,
      });

      toast.success('Team member removed successfully');
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    } catch (error) {
      toast.error('Failed to remove team member');
      console.error(error);
    }
  };

  if (workspacesLoading || membersLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading team members...</p>
        </div>
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <Users className="h-16 w-16 text-muted-foreground/50 mx-auto" />
          <h2 className="text-2xl font-semibold">No Workspace Found</h2>
          <p className="text-muted-foreground">Create a workspace to manage team members</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Team Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your workspace team members and add new users
          </p>
        </div>
      </div>

      {/* Team Management Tabs */}
      <Tabs defaultValue="members" className="space-y-6">
        <TabsList
          className={canInviteMembers ? 'grid w-full grid-cols-2' : 'grid w-full grid-cols-1'}
        >
          <TabsTrigger value="members">Team Members</TabsTrigger>
          {canInviteMembers && <TabsTrigger value="add-members">Add Members</TabsTrigger>}
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMembers}</div>
                <p className="text-xs text-muted-foreground mt-1">{stats.activeMembers} active</p>
              </CardContent>
            </Card>
            {Object.entries(stats.roleBreakdown)
              .slice(0, 3)
              .map(([role, count]) => (
                <Card key={role}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      {ROLE_CONFIG[role as keyof typeof ROLE_CONFIG]?.label || role}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{count}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((count / stats.totalMembers) * 100).toFixed(0)}% of team
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>

          {/* Resource Allocation */}
          {workloadData && (
            <ResourceAllocationCard
              workloadData={workloadData.members}
              averageWorkload={workloadData.averageWorkload}
            />
          )}

          {/* Filters & Team Directory */}
          <Card>
            <CardHeader>
              <CardTitle>Team Directory</CardTitle>
              <CardDescription>Search and filter team members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Roles</SelectItem>
                    {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                      <SelectItem key={role} value={role}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                      <SelectItem key={status} value={status}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Team Members Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Workload</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Joined</TableHead>
                      {canInviteMembers && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canInviteMembers ? 7 : 6} className="text-center py-8">
                          <div className="text-muted-foreground">No team members found</div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMembers.map((member) => {
                        const isCurrentUser = member.userId === user?.$id;
                        const memberCounts = taskCounts?.get(member.userId);
                        const activeTasks = memberCounts?.activeTasks || 0;
                        const overdueTasks = memberCounts?.overdueTasks || 0;
                        const completedTasks = memberCounts?.completedTasks || 0;
                        const workload = getWorkloadLevel(activeTasks);

                        return (
                          <TableRow key={member.$id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {/* Avatar with conditional ring for current user */}
                                <div
                                  className={cn(
                                    'relative',
                                    isCurrentUser &&
                                      'p-1 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/50 animate-pulse'
                                  )}
                                >
                                  <Avatar
                                    className={cn(
                                      'h-10 w-10',
                                      isCurrentUser && 'ring-4 ring-background'
                                    )}
                                  >
                                    <AvatarImage src={member.avatar} alt={member.name} />
                                    <AvatarFallback
                                      className={cn(
                                        isCurrentUser &&
                                          'bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 font-bold'
                                      )}
                                    >
                                      {member.name
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    <span className={cn(isCurrentUser && 'font-bold text-primary')}>
                                      {member.name}
                                    </span>
                                    {isCurrentUser && (
                                      <Badge
                                        variant="default"
                                        className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 font-semibold"
                                      >
                                        You
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {member.email}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={ROLE_CONFIG[member.role].color}>
                                {ROLE_CONFIG[member.role].label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={STATUS_CONFIG[member.status].color}>
                                {STATUS_CONFIG[member.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn('text-xs', workload.color)}
                                  >
                                    {workload.label}
                                  </Badge>
                                  <span className="text-sm font-medium">{activeTasks} active</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{completedTasks} done</span>
                                  {overdueTasks > 0 && (
                                    <span className="text-red-500 font-medium">
                                      {overdueTasks} overdue
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  {member.email}
                                </div>
                                {member.phone && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    {member.phone}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(member.$createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {/* Only show actions if user has edit/remove permissions */}
                              {canInviteMembers && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleEditMember(member)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Member
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteMember(member)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Remove Member
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canInviteMembers && (
          <TabsContent value="add-members">
            <AddMembersSection
              workspaceId={currentWorkspace.$id}
              workspaceName={currentWorkspace.name}
              currentUserId={user!.$id}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>Update member details and permissions</DialogDescription>
          </DialogHeader>
          {editingMember && (
            <form onSubmit={handleUpdateMember}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" defaultValue={editingMember.name} required />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={editingMember.email}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" type="tel" defaultValue={editingMember.phone} />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select name="role" defaultValue={editingMember.role}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                        <SelectItem key={role} value={role}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={editingMember.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                        <SelectItem key={status} value={status}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMember.isPending}>
                  {updateMember.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Member Confirmation Dialog */}
      <DeleteMemberDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        member={memberToDelete}
        onConfirm={confirmDeleteMember}
        isDeleting={deleteMember.isPending}
      />
    </div>
  );
}
