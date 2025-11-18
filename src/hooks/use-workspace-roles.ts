'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query } from 'appwrite';
import type { WorkspaceRole, WorkspaceMember, RolePermissions } from '@/types';

const ROLES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_WORKSPACE_ROLES_ID!;
const MEMBERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_WORKSPACE_MEMBERS_ID!;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

// Default permissions template
export const DEFAULT_PERMISSIONS: RolePermissions = {
  canCreateProjects: false,
  canEditProjects: false,
  canDeleteProjects: false,
  canArchiveProjects: false,
  canCreateTasks: false,
  canEditAllTasks: false,
  canEditOwnTasks: true,
  canDeleteTasks: false,
  canAssignTasks: false,
  canCreateSprints: false,
  canEditSprints: false,
  canDeleteSprints: false,
  canStartSprints: false,
  canCompleteSprints: false,
  canCreateRequirements: false,
  canEditRequirements: false,
  canDeleteRequirements: false,
  canApproveRequirements: false,
  canInviteMembers: false,
  canRemoveMembers: false,
  canEditMemberRoles: false,
  canViewAllMembers: true,
  canTrackTime: true,
  canEditOwnTime: true,
  canEditAllTime: false,
  canApproveTime: false,
  canRequestLeave: true,
  canApproveLeave: false,
  canViewAllLeave: false,
  canEditWorkspaceSettings: false,
  canDeleteWorkspace: false,
  canManageBilling: false,
  canViewAnalytics: false,
  canExportData: false,
};

// Predefined role templates
export const ROLE_TEMPLATES = {
  ADMIN: {
    name: 'Admin',
    description: 'Full access to all workspace features',
    permissions: Object.keys(DEFAULT_PERMISSIONS).reduce((acc, key) => {
      acc[key as keyof RolePermissions] = true;
      return acc;
    }, {} as RolePermissions),
    color: 'bg-red-500',
  },
  MANAGER: {
    name: 'Manager',
    description: 'Can manage projects, tasks, and team members',
    permissions: {
      ...DEFAULT_PERMISSIONS,
      canCreateProjects: true,
      canEditProjects: true,
      canArchiveProjects: true,
      canCreateTasks: true,
      canEditAllTasks: true,
      canDeleteTasks: true,
      canAssignTasks: true,
      canCreateSprints: true,
      canEditSprints: true,
      canStartSprints: true,
      canCompleteSprints: true,
      canCreateRequirements: true,
      canEditRequirements: true,
      canApproveRequirements: true,
      canInviteMembers: true,
      canEditMemberRoles: true,
      canEditAllTime: true,
      canApproveTime: true,
      canApproveLeave: true,
      canViewAllLeave: true,
      canViewAnalytics: true,
      canExportData: true,
    },
    color: 'bg-orange-500',
  },
  DEVELOPER: {
    name: 'Software Developer',
    description: 'Can create and manage tasks and requirements',
    permissions: {
      ...DEFAULT_PERMISSIONS,
      canCreateTasks: true,
      canEditAllTasks: false,
      canEditOwnTasks: true,
      canCreateRequirements: true,
      canEditRequirements: true,
      canTrackTime: true,
      canEditOwnTime: true,
      canViewAnalytics: true,
    },
    color: 'bg-blue-500',
  },
  TESTER: {
    name: 'QA Engineer',
    description: 'Can view and test features, report issues',
    permissions: {
      ...DEFAULT_PERMISSIONS,
      canCreateTasks: true,
      canEditOwnTasks: true,
      canViewAnalytics: true,
    },
    color: 'bg-purple-500',
  },
  VIEWER: {
    name: 'Viewer',
    description: 'Read-only access to workspace',
    permissions: {
      ...DEFAULT_PERMISSIONS,
      canCreateTasks: false,
      canEditOwnTasks: false,
      canTrackTime: false,
      canEditOwnTime: false,
      canRequestLeave: false,
    },
    color: 'bg-gray-500',
  },
};

// Get all roles for a workspace
export function useWorkspaceRoles(workspaceId?: string) {
  return useQuery({
    queryKey: ['workspace-roles', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        ROLES_COLLECTION_ID,
        [Query.equal('workspaceId', workspaceId), Query.orderAsc('name')]
      );
      
      return response.documents.map(doc => ({
        ...doc,
        permissions: typeof doc.permissions === 'string' 
          ? JSON.parse(doc.permissions) 
          : doc.permissions,
      })) as unknown as WorkspaceRole[];
    },
    enabled: !!workspaceId,
  });
}

// Get a specific role
export function useWorkspaceRole(roleId?: string) {
  return useQuery({
    queryKey: ['workspace-role', roleId],
    queryFn: async () => {
      if (!roleId) return null;
      
      const response = await databases.getDocument(
        DATABASE_ID,
        ROLES_COLLECTION_ID,
        roleId
      );
      
      return {
        ...response,
        permissions: typeof response.permissions === 'string' 
          ? JSON.parse(response.permissions) 
          : response.permissions,
      } as unknown as WorkspaceRole;
    },
    enabled: !!roleId,
  });
}

// Create a new role
export function useCreateWorkspaceRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      name: string;
      description?: string;
      permissions: RolePermissions;
      color?: string;
      createdBy: string;
    }) => {
      const roleData = {
        ...data,
        permissions: JSON.stringify(data.permissions),
        isCustom: true,
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        ROLES_COLLECTION_ID,
        'unique()',
        roleData
      );

      return {
        ...response,
        permissions: JSON.parse(response.permissions as string),
      } as unknown as WorkspaceRole;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-roles', variables.workspaceId] });
    },
  });
}

// Update a role
export function useUpdateWorkspaceRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      roleId: string;
      workspaceId: string;
      name?: string;
      description?: string;
      permissions?: RolePermissions;
      color?: string;
    }) => {
      const { roleId, workspaceId, ...updates } = data;
      
      const updateData: Record<string, unknown> = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.permissions) updateData.permissions = JSON.stringify(updates.permissions);
      if (updates.color !== undefined) updateData.color = updates.color;

      const response = await databases.updateDocument(
        DATABASE_ID,
        ROLES_COLLECTION_ID,
        roleId,
        updateData
      );

      return {
        ...response,
        permissions: typeof response.permissions === 'string' 
          ? JSON.parse(response.permissions) 
          : response.permissions,
      } as unknown as WorkspaceRole;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-roles', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-role', variables.roleId] });
    },
  });
}

// Delete a role
export function useDeleteWorkspaceRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { roleId: string; workspaceId: string }) => {
      await databases.deleteDocument(DATABASE_ID, ROLES_COLLECTION_ID, data.roleId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-roles', variables.workspaceId] });
    },
  });
}

// Get all members for a workspace
export function useWorkspaceMembers(workspaceId?: string) {
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        MEMBERS_COLLECTION_ID,
        [Query.equal('workspaceId', workspaceId), Query.orderDesc('$createdAt')]
      );
      
      return response.documents as unknown as WorkspaceMember[];
    },
    enabled: !!workspaceId,
  });
}

// Get a specific member
export function useWorkspaceMember(memberId?: string) {
  return useQuery({
    queryKey: ['workspace-member', memberId],
    queryFn: async () => {
      if (!memberId) return null;
      
      const response = await databases.getDocument(
        DATABASE_ID,
        MEMBERS_COLLECTION_ID,
        memberId
      );
      
      return response as unknown as WorkspaceMember;
    },
    enabled: !!memberId,
  });
}

// Add a member to workspace
export function useAddWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      userId: string;
      userName: string;
      userEmail: string;
      userAvatar?: string;
      phone?: string;
      roleId?: string;
      roleName?: string;
      invitedBy?: string;
    }) => {
      const memberData = {
        ...data,
        status: 'ACTIVE' as const,
        joinedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        MEMBERS_COLLECTION_ID,
        'unique()',
        memberData
      );

      return response as unknown as WorkspaceMember;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

// Assign role to member
export function useAssignRoleToMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      memberId: string;
      workspaceId: string;
      roleId: string;
      roleName: string;
    }) => {
      const response = await databases.updateDocument(
        DATABASE_ID,
        MEMBERS_COLLECTION_ID,
        data.memberId,
        {
          roleId: data.roleId,
          roleName: data.roleName,
        }
      );

      return response as unknown as WorkspaceMember;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-member', variables.memberId] });
    },
  });
}

// Update member
export function useUpdateWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      memberId: string;
      workspaceId: string;
      phone?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    }) => {
      const { memberId, workspaceId, ...updates } = data;

      const response = await databases.updateDocument(
        DATABASE_ID,
        MEMBERS_COLLECTION_ID,
        memberId,
        updates
      );

      return response as unknown as WorkspaceMember;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-member', variables.memberId] });
    },
  });
}

// Remove member from workspace
export function useRemoveWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { memberId: string; workspaceId: string }) => {
      await databases.deleteDocument(DATABASE_ID, MEMBERS_COLLECTION_ID, data.memberId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', variables.workspaceId] });
    },
  });
}
