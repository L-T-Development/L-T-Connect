/**
 * Admin User Management Hooks
 * Handles user creation, admin checks, and workspace associations
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query } from 'appwrite';
import { toast } from 'sonner';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const APP_USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_APP_USERS_ID!;

interface AppUser {
  $id: string;
  userId: string;
  email: string;
  name: string;
  isAdmin?: boolean;
  hasTempPassword?: boolean;
  workspaceIds?: string[];
  defaultWorkspaceId?: string;
  avatar?: string;
  phone?: string;
  lastLoginAt?: string;
  createdBy?: string;
}

interface CreateUserParams {
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  workspaceId: string;
  workspaceName: string;
  createdBy: string;
  createdByName: string;
}

/**
 * Get current user's app_users record
 */
export function useAppUser(userId?: string) {
  return useQuery({
    queryKey: ['app-user', userId],
    queryFn: async () => {
      if (!userId) return null;

      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          APP_USERS_COLLECTION_ID,
          [Query.equal('userId', userId), Query.limit(1)]
        );

        if (response.documents.length === 0) {
          return null;
        }

        return response.documents[0] as unknown as AppUser;
      } catch (error) {
        console.error('Error fetching app user:', error);
        return null;
      }
    },
    enabled: !!userId,
  });
}

/**
 * Check if current user is admin
 */
export function useIsAdmin(userId?: string) {
  const { data: appUser, isLoading } = useAppUser(userId);
  
  return {
    isAdmin: appUser?.isAdmin === true,
    isLoading,
    appUser,
  };
}

/**
 * Get all workspaces for current user
 */
export function useUserWorkspaces(userId?: string) {
  const { data: appUser } = useAppUser(userId);
  
  return useQuery({
    queryKey: ['user-workspaces', userId],
    queryFn: async () => {
      if (!appUser?.workspaceIds || appUser.workspaceIds.length === 0) {
        return [];
      }

      // Fetch workspace details for all workspace IDs
      const workspaces = await Promise.all(
        appUser.workspaceIds.map(async (workspaceId) => {
          try {
            const workspace = await databases.getDocument(
              DATABASE_ID,
              process.env.NEXT_PUBLIC_APPWRITE_WORKSPACES_COLLECTION_ID!,
              workspaceId
            );
            return workspace;
          } catch (error) {
            console.error(`Error fetching workspace ${workspaceId}:`, error);
            return null;
          }
        })
      );

      return workspaces.filter((w) => w !== null);
    },
    enabled: !!appUser && !!appUser.workspaceIds && appUser.workspaceIds.length > 0,
  });
}

/**
 * Create new user (admin only)
 * Calls server API to handle auth account creation and emails
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserParams) => {
      // Call server API route to create user
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      return await response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      queryClient.invalidateQueries({ queryKey: ['app-users'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      
      if (result.type === 'new_user') {
        toast.success('User created successfully', {
          description: 'Welcome email sent with temporary password',
        });
      } else {
        toast.success('Invitation sent', {
          description: 'User will receive an email to join this workspace',
        });
      }
    },
    onError: (error: unknown) => {
      toast.error('Failed to create user', {
        description: (error instanceof Error ? error.message : String(error)) || 'Please try again',
      });
    },
  });
}

/**
 * Update user's temp password flag after password change
 */
export function useUpdateTempPasswordFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { userId: string; appUserId: string }) => {
      await databases.updateDocument(
        DATABASE_ID,
        APP_USERS_COLLECTION_ID,
        data.appUserId,
        {
          hasTempPassword: false,
          lastLoginAt: new Date().toISOString(),
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['app-user', variables.userId] });
    },
  });
}

/**
 * Add workspace to user's workspace list
 */
export function useAddUserToWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      appUserId: string;
      userId: string;
      workspaceId: string;
      currentWorkspaceIds: string[];
    }) => {
      const updatedWorkspaceIds = [...data.currentWorkspaceIds, data.workspaceId];

      await databases.updateDocument(
        DATABASE_ID,
        APP_USERS_COLLECTION_ID,
        data.appUserId,
        {
          workspaceIds: updatedWorkspaceIds,
          defaultWorkspaceId: data.workspaceId, // Set as default
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['app-user', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user-workspaces', variables.userId] });
    },
  });
}
