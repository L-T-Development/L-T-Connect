import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-config';
import { Query } from 'appwrite';

export interface TeamMember {
  $id: string;
  userId: string; // ✅ Add userId field from workspace_members
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: 'MANAGER' | 'ASSISTANT_MANAGER' | 'SOFTWARE_DEVELOPER' | 'SOFTWARE_DEVELOPER_INTERN' | 'TESTER' | 'CONTENT_ENGINEER' | 'MEMBER';
  workspaceId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'INVITED';
  $createdAt: string;
  $updatedAt: string;
}

/**
 * Map workspace_members role names to TeamMember role keys
 */
function normalizeRole(role: string): TeamMember['role'] {
  const roleMap: Record<string, TeamMember['role']> = {
    // From workspace_members (human-readable) - exact matches
    'Manager': 'MANAGER',
    'Assistant Manager': 'ASSISTANT_MANAGER',
    'Software Developer': 'SOFTWARE_DEVELOPER',
    'Software Developer Intern': 'SOFTWARE_DEVELOPER_INTERN',
    'Tester': 'TESTER',
    'Content Engineer': 'CONTENT_ENGINEER',
    'Member': 'MEMBER',
    // From CSV/API (uppercase keys)
    'MANAGER': 'MANAGER',
    'ASSISTANT_MANAGER': 'ASSISTANT_MANAGER',
    'SOFTWARE_DEVELOPER': 'SOFTWARE_DEVELOPER',
    'SOFTWARE_DEVELOPER_INTERN': 'SOFTWARE_DEVELOPER_INTERN',
    'TESTER': 'TESTER',
    'CONTENT_ENGINEER': 'CONTENT_ENGINEER',
    'MEMBER': 'MEMBER',
  };

  return roleMap[role] || 'MEMBER';
}

export function useTeamMembers(workspaceId?: string) {
  return useQuery({
    queryKey: ['team-members', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      // Query workspace_members collection (new system)
      const WORKSPACE_MEMBERS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_WORKSPACE_MEMBERS_ID || 'workspace_members';

      const response = await databases.listDocuments(
        DATABASE_ID,
        WORKSPACE_MEMBERS_COLLECTION,
        [Query.equal('workspaceId', workspaceId), Query.limit(100)]
      );

      // Map workspace_members to TeamMember interface
      return response.documents.map((doc: any) => ({
        $id: doc.$id,
        userId: doc.userId, // ✅ Include userId from workspace_members
        email: doc.email,
        name: doc.userName || doc.name,
        phone: doc.phone || '',
        avatar: doc.avatar || '',
        role: normalizeRole(doc.role),
        workspaceId: doc.workspaceId,
        status: doc.status || 'ACTIVE',
        $createdAt: doc.$createdAt,
        $updatedAt: doc.$updatedAt,
      })) as TeamMember[];
    },
    enabled: !!workspaceId,
  });
}

export function useTeamMember(memberId?: string) {
  return useQuery({
    queryKey: ['team-member', memberId],
    queryFn: async () => {
      if (!memberId) return null;

      const response = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        memberId
      );

      return response as unknown as TeamMember;
    },
    enabled: !!memberId,
  });
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<TeamMember, '$id' | '$createdAt' | '$updatedAt'>) => {
      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        'unique()',
        data
      );

      return response as unknown as TeamMember;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', variables.workspaceId] });
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TeamMember> }) => {
      const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        id,
        data
      );

      return response as unknown as TeamMember;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', data.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['team-member', data.$id] });
    },
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      // ✅ Delete from workspace_members collection (same as where we fetch from)
      const WORKSPACE_MEMBERS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_WORKSPACE_MEMBERS_ID || 'workspace_members';

      await databases.deleteDocument(
        DATABASE_ID,
        WORKSPACE_MEMBERS_COLLECTION,
        id
      );

      return { id, workspaceId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', data.workspaceId] });
    },
  });
}

// Role labels and colors
export const ROLE_CONFIG = {
  MANAGER: { label: 'Manager', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  ASSISTANT_MANAGER: { label: 'Assistant Manager', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  SOFTWARE_DEVELOPER: { label: 'Software Developer', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  SOFTWARE_DEVELOPER_INTERN: { label: 'Software Developer Intern', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' },
  TESTER: { label: 'Tester', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  CONTENT_ENGINEER: { label: 'Content Engineer', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' },
  MEMBER: { label: 'Member', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
} as const;

export const STATUS_CONFIG = {
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  INACTIVE: { label: 'Inactive', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  INVITED: { label: 'Invited', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
} as const;
