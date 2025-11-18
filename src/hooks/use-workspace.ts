import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query } from 'appwrite';
import type { Workspace } from '@/types';
import { toast } from '@/hooks/use-toast';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const WORKSPACES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_WORKSPACES_COLLECTION_ID!;

export function useWorkspaces(userId?: string) {
  return useQuery({
    queryKey: ['workspaces', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Query workspaces where user is owner
      const response = await databases.listDocuments(
        DATABASE_ID,
        WORKSPACES_COLLECTION_ID,
        [Query.equal('ownerId', userId)]
      );
      
      // Also query all workspaces and filter by memberIds in client
      // (Appwrite stores memberIds as an array, but we handle both formats for compatibility)
      const allWorkspacesResponse = await databases.listDocuments(
        DATABASE_ID,
        WORKSPACES_COLLECTION_ID,
        [Query.limit(100)]
      );
      
      // Filter workspaces where user is a member
      const memberWorkspaces = allWorkspacesResponse.documents.filter((workspace: any) => {
        const memberIds = Array.isArray(workspace.memberIds) 
          ? workspace.memberIds 
          : [];
        return memberIds.includes(userId);
      });
      
      // Combine and deduplicate
      const allWorkspaces = [...response.documents, ...memberWorkspaces];
      const uniqueWorkspaces = allWorkspaces.filter((workspace, index, self) =>
        index === self.findIndex((w: any) => w.$id === workspace.$id)
      );
      
      // Parse settings JSON
      const parsedWorkspaces = uniqueWorkspaces.map((workspace: any) => ({
        ...workspace,
        settings: typeof workspace.settings === 'string' 
          ? JSON.parse(workspace.settings) 
          : workspace.settings,
        memberIds: Array.isArray(workspace.memberIds)
          ? workspace.memberIds
          : [],
      }));
      
      return parsedWorkspaces as unknown as Workspace[];
    },
    enabled: !!userId,
  });
}

export function useWorkspace(workspaceId?: string) {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      
      const response = await databases.getDocument(
        DATABASE_ID,
        WORKSPACES_COLLECTION_ID,
        workspaceId
      );
      
      // Parse JSON fields
      const workspace = {
        ...response,
        settings: typeof response.settings === 'string' 
          ? JSON.parse(response.settings) 
          : response.settings,
        memberIds: Array.isArray(response.memberIds)
          ? response.memberIds
          : [],
      };
      
      return workspace as unknown as Workspace;
    },
    enabled: !!workspaceId,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      ownerId: string;
    }) => {
      // Check if user already has a workspace with this name
      const existingWorkspaces = await databases.listDocuments(
        DATABASE_ID,
        WORKSPACES_COLLECTION_ID,
        [
          Query.equal('ownerId', data.ownerId),
          Query.equal('name', data.name)
        ]
      );

      if (existingWorkspaces.documents.length > 0) {
        throw new Error('You already have a workspace with this name. Please choose a different name.');
      }

      const workspaceData = {
        name: data.name,
        description: data.description || '',
        ownerId: data.ownerId,
        memberIds: [data.ownerId], // Native array, not JSON string
        inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
        settings: JSON.stringify({
          allowPublicSignup: false,
          requireApproval: true,
          enableNotifications: true,
          enableIntegrations: false,
        }),
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        WORKSPACES_COLLECTION_ID,
        'unique()',
        workspaceData
      );

      // Parse the response
      const workspace = {
        ...response,
        settings: JSON.parse(response.settings as any),
        memberIds: Array.isArray(response.memberIds) ? response.memberIds : [response.memberIds],
      };

      return workspace as unknown as Workspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast({
        title: 'Success',
        description: 'Workspace created successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create workspace',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      name?: string;
      description?: string;
      settings?: Workspace['settings'];
    }) => {
      const { workspaceId, ...updates } = data;
      
      // Convert settings to JSON string if provided
      const updateData: any = { ...updates };
      if (updates.settings) {
        updateData.settings = JSON.stringify(updates.settings);
      }
      
      const response = await databases.updateDocument(
        DATABASE_ID,
        WORKSPACES_COLLECTION_ID,
        workspaceId,
        updateData
      );

      // Parse the response
      const workspace = {
        ...response,
        settings: typeof response.settings === 'string' 
          ? JSON.parse(response.settings) 
          : response.settings,
        memberIds: Array.isArray(response.memberIds)
          ? response.memberIds
          : [],
      };

      return workspace as unknown as Workspace;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast({
        title: 'Success',
        description: 'Workspace updated successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update workspace',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const { Query } = await import('appwrite');
      const { COLLECTIONS } = await import('@/lib/appwrite-config');
      
      // Cascade delete all workspace-related data
      try {
        // Delete all projects in the workspace
        const projectsQuery = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.PROJECTS,
          [Query.equal('workspaceId', workspaceId), Query.limit(500)]
        );
        
        for (const project of projectsQuery.documents) {
          await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECTS, project.$id);
        }
        
        // Delete all tasks
        const tasksQuery = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.TASKS,
          [Query.equal('workspaceId', workspaceId), Query.limit(500)]
        );
        
        for (const task of tasksQuery.documents) {
          await databases.deleteDocument(DATABASE_ID, COLLECTIONS.TASKS, task.$id);
        }
        
        // Delete all epics
        try {
          const epicsQuery = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.EPICS,
            [Query.equal('workspaceId', workspaceId), Query.limit(500)]
          );
          
          for (const epic of epicsQuery.documents) {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.EPICS, epic.$id);
          }
        } catch (error) {
          console.warn('Error deleting epics:', error);
        }
        
        // Delete all sprints
        try {
          const sprintsQuery = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.SPRINTS,
            [Query.equal('workspaceId', workspaceId), Query.limit(500)]
          );
          
          for (const sprint of sprintsQuery.documents) {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.SPRINTS, sprint.$id);
          }
        } catch (error) {
          console.warn('Error deleting sprints:', error);
        }
        
        // Delete all requirements
        try {
          const requirementsQuery = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.FUNCTIONAL_REQUIREMENTS,
            [Query.equal('workspaceId', workspaceId), Query.limit(500)]
          );
          
          for (const req of requirementsQuery.documents) {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.FUNCTIONAL_REQUIREMENTS, req.$id);
          }
        } catch (error) {
          console.warn('Error deleting functional requirements:', error);
        }
        
        try {
          const clientReqsQuery = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.CLIENT_REQUIREMENTS,
            [Query.equal('workspaceId', workspaceId), Query.limit(500)]
          );
          
          for (const req of clientReqsQuery.documents) {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.CLIENT_REQUIREMENTS, req.$id);
          }
        } catch (error) {
          console.warn('Error deleting client requirements:', error);
        }
        
        // Delete attendance records
        try {
          const attendanceQuery = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.ATTENDANCE,
            [Query.equal('workspaceId', workspaceId), Query.limit(500)]
          );
          
          for (const record of attendanceQuery.documents) {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.ATTENDANCE, record.$id);
          }
        } catch (error) {
          console.warn('Error deleting attendance records:', error);
        }
        
        // Delete leave requests
        try {
          const leaveQuery = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.LEAVE_REQUESTS,
            [Query.equal('workspaceId', workspaceId), Query.limit(500)]
          );
          
          for (const leave of leaveQuery.documents) {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.LEAVE_REQUESTS, leave.$id);
          }
        } catch (error) {
          console.warn('Error deleting leave requests:', error);
        }
        
        // Delete notifications
        try {
          const notificationsQuery = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.NOTIFICATIONS,
            [Query.equal('workspaceId', workspaceId), Query.limit(500)]
          );
          
          for (const notification of notificationsQuery.documents) {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.NOTIFICATIONS, notification.$id);
          }
        } catch (error) {
          console.warn('Error deleting notifications:', error);
        }
        
        // Delete workspace members (if collection exists)
        try {
          const MEMBERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_WORKSPACE_MEMBERS_ID;
          if (MEMBERS_COLLECTION_ID) {
            const membersQuery = await databases.listDocuments(
              DATABASE_ID,
              MEMBERS_COLLECTION_ID,
              [Query.equal('workspaceId', workspaceId), Query.limit(500)]
            );
            
            for (const member of membersQuery.documents) {
              await databases.deleteDocument(DATABASE_ID, MEMBERS_COLLECTION_ID, member.$id);
            }
          }
        } catch (error) {
          console.warn('Error deleting workspace members:', error);
        }
        
        // Delete email invitations (if collection exists)
        try {
          const EMAIL_INVITATIONS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_EMAIL_INVITATIONS_ID;
          if (EMAIL_INVITATIONS_COLLECTION_ID) {
            const invitationsQuery = await databases.listDocuments(
              DATABASE_ID,
              EMAIL_INVITATIONS_COLLECTION_ID,
              [Query.equal('workspaceId', workspaceId), Query.limit(500)]
            );
            
            for (const invitation of invitationsQuery.documents) {
              await databases.deleteDocument(DATABASE_ID, EMAIL_INVITATIONS_COLLECTION_ID, invitation.$id);
            }
          }
        } catch (error) {
          console.warn('Error deleting email invitations:', error);
        }
        
        // Delete invite codes (if collection exists)
        try {
          const INVITE_CODES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_INVITE_CODES_ID;
          if (INVITE_CODES_COLLECTION_ID) {
            const codesQuery = await databases.listDocuments(
              DATABASE_ID,
              INVITE_CODES_COLLECTION_ID,
              [Query.equal('workspaceId', workspaceId), Query.limit(500)]
            );
            
            for (const code of codesQuery.documents) {
              await databases.deleteDocument(DATABASE_ID, INVITE_CODES_COLLECTION_ID, code.$id);
            }
          }
        } catch (error) {
          console.warn('Error deleting invite codes:', error);
        }
        
        // Delete time entries (if collection exists)
        try {
          const TIME_ENTRIES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_TIME_ENTRIES_ID;
          if (TIME_ENTRIES_COLLECTION_ID) {
            const timeEntriesQuery = await databases.listDocuments(
              DATABASE_ID,
              TIME_ENTRIES_COLLECTION_ID,
              [Query.equal('workspaceId', workspaceId), Query.limit(500)]
            );
            
            for (const entry of timeEntriesQuery.documents) {
              await databases.deleteDocument(DATABASE_ID, TIME_ENTRIES_COLLECTION_ID, entry.$id);
            }
          }
        } catch (error) {
          console.warn('Error deleting time entries:', error);
        }
        
        // Delete active timers (if collection exists)
        try {
          const ACTIVE_TIMERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ACTIVE_TIMERS_ID;
          if (ACTIVE_TIMERS_COLLECTION_ID) {
            const timersQuery = await databases.listDocuments(
              DATABASE_ID,
              ACTIVE_TIMERS_COLLECTION_ID,
              [Query.equal('workspaceId', workspaceId), Query.limit(500)]
            );
            
            for (const timer of timersQuery.documents) {
              await databases.deleteDocument(DATABASE_ID, ACTIVE_TIMERS_COLLECTION_ID, timer.$id);
            }
          }
        } catch (error) {
          console.warn('Error deleting active timers:', error);
        }
        
        // Delete task comments (if collection exists)
        try {
          const taskCommentsQuery = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.TASK_COMMENTS,
            [Query.equal('workspaceId', workspaceId), Query.limit(500)]
          );
          
          for (const comment of taskCommentsQuery.documents) {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.TASK_COMMENTS, comment.$id);
          }
        } catch (error) {
          console.warn('Error deleting task comments:', error);
        }
        
        // Finally, delete the workspace itself
        await databases.deleteDocument(
          DATABASE_ID,
          WORKSPACES_COLLECTION_ID,
          workspaceId
        );
      } catch (error) {
        console.error('Error during workspace deletion:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast({
        title: 'Success',
        description: 'Workspace and all associated data deleted successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete workspace',
        variant: 'destructive',
      });
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      email: string;
      role: string;
      inviterName: string;
    }) => {
      // Get workspace details
      const workspace = await databases.getDocument(
        DATABASE_ID,
        WORKSPACES_COLLECTION_ID,
        data.workspaceId
      ) as any;

      // Generate invite code
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Send invitation email via API route (server-side)
      const emailResponse = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: data.email,
          workspaceName: workspace.name,
          inviterName: data.inviterName,
          inviteCode,
        }),
      });

      const emailResult = await emailResponse.json();

      if (!emailResponse.ok || !emailResult.success) {
        throw new Error(emailResult.error || 'Failed to send invitation email');
      }

      // Store invitation in database for tracking
      // You can create a separate collection for invitations if needed
      // For now, we'll just return the data
      
      return { ...data, inviteCode, emailSent: true };
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', variables.workspaceId] });
      toast({
        title: 'Invitation Sent',
        description: `Invitation email sent to ${variables.email}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    },
  });
}

export function useJoinWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      inviteCode: string; 
      userId: string;
      userName: string;
      userEmail: string;
      userAvatar?: string;
      message?: string;
    }) => {
      // Search for workspace by invite code
      const workspaces = await databases.listDocuments(
        DATABASE_ID,
        WORKSPACES_COLLECTION_ID,
        [Query.equal('inviteCode', data.inviteCode)]
      );

      if (workspaces.documents.length === 0) {
        throw new Error('Invalid invite code. Please check and try again.');
      }

      const workspace = workspaces.documents[0] as any;

      // Check if user is already the owner
      if (workspace.ownerId === data.userId) {
        throw new Error('You are already the owner of this workspace');
      }

      // Get current members (Appwrite stores as array)
      const currentMembers = Array.isArray(workspace.memberIds)
        ? workspace.memberIds
        : [];
        
      if (currentMembers.includes(data.userId)) {
        throw new Error('You are already a member of this workspace');
      }

      // Check if user already has a pending request
      const existingRequests = await databases.listDocuments(
        DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_JOIN_REQUESTS_ID!,
        [
          Query.equal('workspaceId', workspace.$id),
          Query.equal('userId', data.userId),
          Query.equal('status', 'PENDING')
        ]
      );

      if (existingRequests.documents.length > 0) {
        throw new Error('You already have a pending join request for this workspace');
      }

      // Create a join request instead of directly adding the user
      const joinRequest = await databases.createDocument(
        DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_JOIN_REQUESTS_ID!,
        'unique()',
        {
          workspaceId: workspace.$id,
          workspaceName: workspace.name,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          userAvatar: data.userAvatar || '',
          inviteCode: data.inviteCode,
          status: 'PENDING',
          message: data.message || '',
          requestedAt: new Date().toISOString(),
        }
      );

      return { joinRequest, workspace };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      toast({
        title: 'Request Sent',
        description: 'Your join request has been sent to the workspace owner for approval',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to join workspace',
        variant: 'destructive',
      });
      throw error;
    },
  });
}

// Get workspace members (users) by workspace ID
export function useWorkspaceMembers(workspaceId?: string) {
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      // Get workspace to access memberIds
      const workspace = await databases.getDocument(
        DATABASE_ID,
        WORKSPACES_COLLECTION_ID,
        workspaceId
      );

      const memberIds = Array.isArray(workspace.memberIds) ? workspace.memberIds : [];
      
      if (memberIds.length === 0) return [];

      // Fetch user details from the users collection
      // Note: This assumes you have a users collection set up
      // If not, you'll need to adapt this to your user management system
      const USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID;
      
      if (!USERS_COLLECTION_ID) {
        // Fallback: return basic user objects with just IDs
        return memberIds.map((id: string) => ({
          $id: id,
          name: 'User ' + id.slice(0, 8),
          email: '',
        }));
      }

      try {
        // Fetch all members (Appwrite Query.equal with arrays fetches documents where field contains any value in array)
        const usersResponse = await databases.listDocuments(
          DATABASE_ID,
          USERS_COLLECTION_ID,
          [Query.limit(100)]
        );

        // Filter to only members of this workspace
        const members = usersResponse.documents.filter((user: any) => 
          memberIds.includes(user.$id)
        );

        return members;
      } catch (error) {
        // If users collection doesn't exist, return basic info
        console.warn('Could not fetch user details:', error);
        return memberIds.map((id: string) => ({
          $id: id,
          name: 'User ' + id.slice(0, 8),
          email: '',
        }));
      }
    },
    enabled: !!workspaceId,
  });
}
