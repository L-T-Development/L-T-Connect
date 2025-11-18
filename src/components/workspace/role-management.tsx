'use client';

import * as React from 'react';
import { Shield, Plus, Edit, Trash2, Users, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  useWorkspaceRoles,
  useWorkspaceMembers,
  useCreateWorkspaceRole,
  useUpdateWorkspaceRole,
  useDeleteWorkspaceRole,
  useAssignRoleToMember,
  ROLE_TEMPLATES,
  DEFAULT_PERMISSIONS,
} from '@/hooks/use-workspace-roles';
import type { WorkspaceRole, WorkspaceMember, RolePermissions } from '@/types';

interface RoleManagementProps {
  workspaceId: string;
  currentUserId: string;
}

export function RoleManagement({ workspaceId, currentUserId }: RoleManagementProps) {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<WorkspaceRole | null>(null);
  const [selectedMember, setSelectedMember] = React.useState<WorkspaceMember | null>(null);

  const { data: roles = [] } = useWorkspaceRoles(workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const createRole = useCreateWorkspaceRole();
  const updateRole = useUpdateWorkspaceRole();
  const deleteRole = useDeleteWorkspaceRole();
  const assignRole = useAssignRoleToMember();

  const [roleForm, setRoleForm] = React.useState({
    name: '',
    description: '',
    color: 'bg-blue-500',
    permissions: { ...DEFAULT_PERMISSIONS },
  });

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createRole.mutateAsync({
        workspaceId,
        name: roleForm.name,
        description: roleForm.description,
        color: roleForm.color,
        permissions: roleForm.permissions,
        createdBy: currentUserId,
      });

      toast.success('Role created successfully');
      setCreateDialogOpen(false);
      setRoleForm({
        name: '',
        description: '',
        color: 'bg-blue-500',
        permissions: { ...DEFAULT_PERMISSIONS },
      });
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error('Failed to create role');
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    try {
      await updateRole.mutateAsync({
        roleId: selectedRole.$id,
        workspaceId,
        name: roleForm.name,
        description: roleForm.description,
        color: roleForm.color,
        permissions: roleForm.permissions,
      });

      toast.success('Role updated successfully');
      setEditDialogOpen(false);
      setSelectedRole(null);
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleDeleteRole = async (role: WorkspaceRole) => {
    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) return;

    // Check if any members have this role
    const membersWithRole = members.filter((m) => m.roleId === role.$id);
    if (membersWithRole.length > 0) {
      toast.error(`Cannot delete role "${role.name}"`, {
        description: `${membersWithRole.length} member(s) currently have this role. Reassign them first.`,
      });
      return;
    }

    try {
      await deleteRole.mutateAsync({
        roleId: role.$id,
        workspaceId,
      });

      toast.success('Role deleted successfully');
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    }
  };

  const openEditDialog = (role: WorkspaceRole) => {
    setSelectedRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || '',
      color: role.color || 'bg-blue-500',
      permissions: { ...role.permissions },
    });
    setEditDialogOpen(true);
  };

  const openAssignDialog = (member: WorkspaceMember) => {
    setSelectedMember(member);
    setAssignDialogOpen(true);
  };

  const handleAssignRole = async (roleId: string) => {
    if (!selectedMember) return;

    const role = roles.find((r) => r.$id === roleId);
    if (!role) return;

    try {
      await assignRole.mutateAsync({
        memberId: selectedMember.$id,
        workspaceId,
        roleId: role.$id,
        roleName: role.name,
      });

      toast.success(`Assigned ${role.name} role to ${selectedMember.userName}`);
      setAssignDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Failed to assign role');
    }
  };

  const useTemplate = (templateKey: keyof typeof ROLE_TEMPLATES) => {
    const template = ROLE_TEMPLATES[templateKey];
    setRoleForm({
      ...roleForm,
      name: template.name,
      description: template.description,
      color: template.color,
      permissions: { ...template.permissions },
    });
  };

  const PermissionsEditor = () => {
    const permissionGroups = {
      'Project Management': [
        'canCreateProjects',
        'canEditProjects',
        'canDeleteProjects',
        'canArchiveProjects',
      ],
      'Task Management': [
        'canCreateTasks',
        'canEditAllTasks',
        'canEditOwnTasks',
        'canDeleteTasks',
        'canAssignTasks',
      ],
      'Sprint Management': [
        'canCreateSprints',
        'canEditSprints',
        'canDeleteSprints',
        'canStartSprints',
        'canCompleteSprints',
      ],
      'Requirements': [
        'canCreateRequirements',
        'canEditRequirements',
        'canDeleteRequirements',
        'canApproveRequirements',
      ],
      'Team Management': [
        'canInviteMembers',
        'canRemoveMembers',
        'canEditMemberRoles',
        'canViewAllMembers',
      ],
      'Time Tracking': [
        'canTrackTime',
        'canEditOwnTime',
        'canEditAllTime',
        'canApproveTime',
      ],
      'Leave Management': ['canRequestLeave', 'canApproveLeave', 'canViewAllLeave'],
      'Workspace Settings': [
        'canEditWorkspaceSettings',
        'canDeleteWorkspace',
        'canManageBilling',
      ],
      Analytics: ['canViewAnalytics', 'canExportData'],
    };

    const formatPermissionName = (perm: string) => {
      return perm
        .replace(/^can/, '')
        .replace(/([A-Z])/g, ' $1')
        .trim();
    };

    return (
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-6">
          {Object.entries(permissionGroups).map(([group, perms]) => (
            <div key={group} className="space-y-3">
              <h4 className="font-medium text-sm">{group}</h4>
              <div className="space-y-2 pl-4">
                {perms.map((perm) => (
                  <div key={perm} className="flex items-center justify-between">
                    <Label htmlFor={perm} className="text-sm font-normal">
                      {formatPermissionName(perm)}
                    </Label>
                    <Switch
                      id={perm}
                      checked={roleForm.permissions[perm as keyof RolePermissions]}
                      onCheckedChange={(checked) =>
                        setRoleForm({
                          ...roleForm,
                          permissions: {
                            ...roleForm.permissions,
                            [perm]: checked,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Management
            </CardTitle>
            <CardDescription>Create and manage workspace roles and permissions</CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh]">
              <form onSubmit={handleCreateRole}>
                <DialogHeader>
                  <DialogTitle>Create New Role</DialogTitle>
                  <DialogDescription>Define a custom role with specific permissions</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="basic" className="mt-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="permissions">Permissions</TabsTrigger>
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="roleName">Role Name *</Label>
                      <Input
                        id="roleName"
                        value={roleForm.name}
                        onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                        placeholder="e.g., Software Developer"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="roleDescription">Description</Label>
                      <Textarea
                        id="roleDescription"
                        value={roleForm.description}
                        onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                        placeholder="Describe this role's responsibilities..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="roleColor">Badge Color</Label>
                      <Select
                        value={roleForm.color}
                        onValueChange={(value) => setRoleForm({ ...roleForm, color: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bg-blue-500">Blue</SelectItem>
                          <SelectItem value="bg-green-500">Green</SelectItem>
                          <SelectItem value="bg-yellow-500">Yellow</SelectItem>
                          <SelectItem value="bg-red-500">Red</SelectItem>
                          <SelectItem value="bg-purple-500">Purple</SelectItem>
                          <SelectItem value="bg-orange-500">Orange</SelectItem>
                          <SelectItem value="bg-pink-500">Pink</SelectItem>
                          <SelectItem value="bg-gray-500">Gray</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="permissions">
                    <PermissionsEditor />
                  </TabsContent>

                  <TabsContent value="templates" className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Start with a predefined role template:
                    </p>
                    {Object.entries(ROLE_TEMPLATES).map(([key, template]) => (
                      <Card
                        key={key}
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => useTemplate(key as keyof typeof ROLE_TEMPLATES)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{template.name}</h4>
                              <p className="text-sm text-muted-foreground">{template.description}</p>
                            </div>
                            <Badge className={template.color}>{template.name}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>

                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createRole.isPending || !roleForm.name}>
                    {createRole.isPending ? 'Creating...' : 'Create Role'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="roles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="roles">Roles ({roles.length})</TabsTrigger>
            <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="roles">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Shield className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground">No roles created yet</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((role) => {
                      const memberCount = members.filter((m) => m.roleId === role.$id).length;
                      return (
                        <TableRow key={role.$id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge className={role.color}>{role.name}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="text-sm text-muted-foreground truncate">
                              {role.description || 'No description'}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span className="text-sm">{memberCount}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={role.isCustom ? 'default' : 'secondary'}>
                              {role.isCustom ? 'Custom' : 'Default'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditDialog(role)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {role.isCustom && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteRole(role)}
                                  disabled={deleteRole.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="members">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground">No members found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => (
                      <TableRow key={member.$id}>
                        <TableCell className="font-medium">{member.userName}</TableCell>
                        <TableCell className="text-muted-foreground">{member.userEmail}</TableCell>
                        <TableCell>
                          {member.roleName ? (
                            <Badge variant="secondary">{member.roleName}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">No role assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAssignDialog(member)}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Assign Role
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <form onSubmit={handleUpdateRole}>
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>Update role details and permissions</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="basic" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editRoleName">Role Name *</Label>
                  <Input
                    id="editRoleName"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editRoleDescription">Description</Label>
                  <Textarea
                    id="editRoleDescription"
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editRoleColor">Badge Color</Label>
                  <Select
                    value={roleForm.color}
                    onValueChange={(value) => setRoleForm({ ...roleForm, color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bg-blue-500">Blue</SelectItem>
                      <SelectItem value="bg-green-500">Green</SelectItem>
                      <SelectItem value="bg-yellow-500">Yellow</SelectItem>
                      <SelectItem value="bg-red-500">Red</SelectItem>
                      <SelectItem value="bg-purple-500">Purple</SelectItem>
                      <SelectItem value="bg-orange-500">Orange</SelectItem>
                      <SelectItem value="bg-pink-500">Pink</SelectItem>
                      <SelectItem value="bg-gray-500">Gray</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="permissions">
                <PermissionsEditor />
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateRole.isPending}>
                {updateRole.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Role Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Select a role to assign to {selectedMember?.userName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {roles.map((role) => (
              <Card
                key={role.$id}
                className={`cursor-pointer transition-colors ${
                  selectedMember?.roleId === role.$id ? 'border-primary bg-accent' : 'hover:bg-accent'
                }`}
                onClick={() => handleAssignRole(role.$id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={role.color}>{role.name}</Badge>
                        {selectedMember?.roleId === role.$id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {role.description || 'No description'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
