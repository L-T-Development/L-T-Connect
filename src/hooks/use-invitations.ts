import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query, ID } from 'appwrite';
import type { EmailInvitation, InviteCode, UserRole, InvitationStatus } from '@/types';
import { toast } from 'sonner';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const EMAIL_INVITATIONS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_EMAIL_INVITATIONS_ID!;
const INVITE_CODES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_INVITE_CODES_ID!;

// ============================================================================
// EMAIL INVITATIONS
// ============================================================================

/**
 * Get all email invitations for a workspace
 */
export function useEmailInvitations(workspaceId?: string, status?: InvitationStatus) {
  return useQuery({
    queryKey: ['email-invitations', workspaceId, status],
    queryFn: async () => {
      if (!workspaceId) return [];

      const queries = [
        Query.equal('workspaceId', workspaceId),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ];

      if (status) {
        queries.push(Query.equal('status', status));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        EMAIL_INVITATIONS_COLLECTION_ID,
        queries
      );

      return response.documents as unknown as EmailInvitation[];
    },
    enabled: !!workspaceId,
  });
}

/**
 * Get pending email invitations for a workspace
 */
export function usePendingEmailInvitations(workspaceId?: string) {
  return useEmailInvitations(workspaceId, 'PENDING');
}

/**
 * Get email invitation by code
 */
export function useEmailInvitationByCode(code?: string) {
  return useQuery({
    queryKey: ['email-invitation', code],
    queryFn: async () => {
      if (!code) return null;

      const response = await databases.listDocuments(
        DATABASE_ID,
        EMAIL_INVITATIONS_COLLECTION_ID,
        [Query.equal('inviteCode', code), Query.limit(1)]
      );

      return response.documents.length > 0
        ? (response.documents[0] as unknown as EmailInvitation)
        : null;
    },
    enabled: !!code,
  });
}

/**
 * Create email invitation
 */
export function useCreateEmailInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      workspaceName: string;
      email: string;
      role: UserRole;
      invitedBy: string;
      inviterName: string;
      expiresAt?: string;
    }) => {
      // Generate unique invite code
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      const invitationData = {
        workspaceId: data.workspaceId,
        workspaceName: data.workspaceName,
        email: data.email,
        role: data.role,
        invitedBy: data.invitedBy,
        inviterName: data.inviterName,
        status: 'PENDING' as InvitationStatus,
        inviteCode,
        expiresAt: data.expiresAt,
        emailSent: false,
        remindersSent: 0,
        currentUses: 0,
        usedBy: [],
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        EMAIL_INVITATIONS_COLLECTION_ID,
        ID.unique(),
        invitationData
      );

      // Send invitation email via API route
      try {
        const emailResponse = await fetch('/api/send-invitation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: data.email,
            workspaceName: data.workspaceName,
            inviterName: data.inviterName,
            inviteCode,
            role: data.role,
            expiresAt: data.expiresAt,
          }),
        });

        if (emailResponse.ok) {
          // Update invitation to mark email as sent
          await databases.updateDocument(
            DATABASE_ID,
            EMAIL_INVITATIONS_COLLECTION_ID,
            response.$id,
            {
              emailSent: true,
              emailSentAt: new Date().toISOString(),
            }
          );
        }
      } catch (error) {
        console.error('Failed to send invitation email:', error);
        // Don't fail the whole operation if email fails
      }

      return response as unknown as EmailInvitation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-invitations', data.workspaceId] });
      toast.success('Email invitation sent!', {
        description: `Invitation sent to ${data.email}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to send invitation', {
        description: error.message,
      });
    },
  });
}

/**
 * Accept email invitation
 */
export function useAcceptEmailInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { invitationId: string; userId: string }) => {
      const response = await databases.updateDocument(
        DATABASE_ID,
        EMAIL_INVITATIONS_COLLECTION_ID,
        data.invitationId,
        {
          status: 'ACCEPTED',
          acceptedAt: new Date().toISOString(),
          acceptedByUserId: data.userId,
        }
      );

      return response as unknown as EmailInvitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-invitations'] });
      toast.success('Invitation accepted!');
    },
    onError: (error: Error) => {
      toast.error('Failed to accept invitation', {
        description: error.message,
      });
    },
  });
}

/**
 * Revoke email invitation
 */
export function useRevokeEmailInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      invitationId: string;
      revokedBy: string;
      reason?: string;
    }) => {
      const response = await databases.updateDocument(
        DATABASE_ID,
        EMAIL_INVITATIONS_COLLECTION_ID,
        data.invitationId,
        {
          status: 'REVOKED',
          revokedAt: new Date().toISOString(),
          revokedBy: data.revokedBy,
          revokedReason: data.reason || '',
        }
      );

      return response as unknown as EmailInvitation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-invitations', data.workspaceId] });
      toast.success('Invitation revoked');
    },
    onError: (error: Error) => {
      toast.error('Failed to revoke invitation', {
        description: error.message,
      });
    },
  });
}

/**
 * Resend email invitation
 */
export function useResendEmailInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      // Get the invitation
      const invitation = await databases.getDocument(
        DATABASE_ID,
        EMAIL_INVITATIONS_COLLECTION_ID,
        invitationId
      ) as unknown as EmailInvitation;

      // Resend email
      const emailResponse = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: invitation.email,
          workspaceName: invitation.workspaceName,
          inviterName: invitation.inviterName,
          inviteCode: invitation.inviteCode,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        }),
      });

      if (!emailResponse.ok) {
        throw new Error('Failed to send email');
      }

      // Update invitation
      const response = await databases.updateDocument(
        DATABASE_ID,
        EMAIL_INVITATIONS_COLLECTION_ID,
        invitationId,
        {
          remindersSent: invitation.remindersSent + 1,
          lastReminderAt: new Date().toISOString(),
        }
      );

      return response as unknown as EmailInvitation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-invitations', data.workspaceId] });
      toast.success('Invitation resent!');
    },
    onError: (error: Error) => {
      toast.error('Failed to resend invitation', {
        description: error.message,
      });
    },
  });
}

// ============================================================================
// INVITE CODES
// ============================================================================

/**
 * Get all invite codes for a workspace
 */
export function useInviteCodes(workspaceId?: string) {
  return useQuery({
    queryKey: ['invite-codes', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const response = await databases.listDocuments(
        DATABASE_ID,
        INVITE_CODES_COLLECTION_ID,
        [
          Query.equal('workspaceId', workspaceId),
          Query.orderDesc('$createdAt'),
          Query.limit(100),
        ]
      );

      return response.documents as unknown as InviteCode[];
    },
    enabled: !!workspaceId,
  });
}

/**
 * Get active invite codes for a workspace
 */
export function useActiveInviteCodes(workspaceId?: string) {
  return useQuery({
    queryKey: ['active-invite-codes', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const response = await databases.listDocuments(
        DATABASE_ID,
        INVITE_CODES_COLLECTION_ID,
        [
          Query.equal('workspaceId', workspaceId),
          Query.equal('status', 'ACTIVE'),
          Query.orderDesc('$createdAt'),
          Query.limit(50),
        ]
      );

      // Filter out expired codes client-side
      const now = new Date();
      return (response.documents as unknown as InviteCode[]).filter((code) => {
        if (!code.expiresAt) return true;
        return new Date(code.expiresAt) > now;
      });
    },
    enabled: !!workspaceId,
  });
}

/**
 * Get invite code by code string
 */
export function useInviteCodeByCode(code?: string) {
  return useQuery({
    queryKey: ['invite-code', code],
    queryFn: async () => {
      if (!code) return null;

      const response = await databases.listDocuments(
        DATABASE_ID,
        INVITE_CODES_COLLECTION_ID,
        [Query.equal('code', code), Query.limit(1)]
      );

      return response.documents.length > 0
        ? (response.documents[0] as unknown as InviteCode)
        : null;
    },
    enabled: !!code,
  });
}

/**
 * Create invite code
 */
export function useCreateInviteCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      workspaceName: string;
      role: UserRole;
      createdBy: string;
      creatorName: string;
      expiresAt?: string;
      maxUses?: number;
      requiresApproval: boolean;
      description?: string;
    }) => {
      // Generate unique code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const codeData = {
        workspaceId: data.workspaceId,
        workspaceName: data.workspaceName,
        code,
        role: data.role,
        createdBy: data.createdBy,
        creatorName: data.creatorName,
        status: 'ACTIVE',
        expiresAt: data.expiresAt,
        maxUses: data.maxUses || null,
        currentUses: 0,
        usedBy: [],
        requiresApproval: data.requiresApproval,
        description: data.description || '',
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        INVITE_CODES_COLLECTION_ID,
        ID.unique(),
        codeData
      );

      return response as unknown as InviteCode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invite-codes', data.workspaceId] });
      toast.success('Invite code created!', {
        description: `Code: ${data.code}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create invite code', {
        description: error.message,
      });
    },
  });
}

/**
 * Use invite code (track usage)
 */
export function useUseInviteCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { codeId: string; userId: string }) => {
      // Get the code
      const code = await databases.getDocument(
        DATABASE_ID,
        INVITE_CODES_COLLECTION_ID,
        data.codeId
      ) as unknown as InviteCode;

      // Validate code
      if (code.status !== 'ACTIVE') {
        throw new Error('This invite code is no longer active');
      }

      if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
        throw new Error('This invite code has expired');
      }

      if (code.maxUses && code.currentUses >= code.maxUses) {
        throw new Error('This invite code has reached its maximum uses');
      }

      if (code.usedBy.includes(data.userId)) {
        throw new Error('You have already used this invite code');
      }

      // Update code usage
      const updatedUsedBy = [...code.usedBy, data.userId];
      const newCurrentUses = code.currentUses + 1;
      const isDepletedNow = code.maxUses ? newCurrentUses >= code.maxUses : false;

      const response = await databases.updateDocument(
        DATABASE_ID,
        INVITE_CODES_COLLECTION_ID,
        data.codeId,
        {
          currentUses: newCurrentUses,
          usedBy: updatedUsedBy,
          status: isDepletedNow ? 'DEPLETED' : code.status,
        }
      );

      return response as unknown as InviteCode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invite-codes', data.workspaceId] });
    },
    onError: (error: Error) => {
      toast.error('Failed to use invite code', {
        description: error.message,
      });
    },
  });
}

/**
 * Revoke invite code
 */
export function useRevokeInviteCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      codeId: string;
      revokedBy: string;
      reason?: string;
    }) => {
      const response = await databases.updateDocument(
        DATABASE_ID,
        INVITE_CODES_COLLECTION_ID,
        data.codeId,
        {
          status: 'REVOKED',
          revokedAt: new Date().toISOString(),
          revokedBy: data.revokedBy,
          revokedReason: data.reason || '',
        }
      );

      return response as unknown as InviteCode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invite-codes', data.workspaceId] });
      toast.success('Invite code revoked');
    },
    onError: (error: Error) => {
      toast.error('Failed to revoke invite code', {
        description: error.message,
      });
    },
  });
}

/**
 * Delete invite code
 */
export function useDeleteInviteCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { codeId: string; workspaceId: string }) => {
      await databases.deleteDocument(
        DATABASE_ID,
        INVITE_CODES_COLLECTION_ID,
        data.codeId
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invite-codes', data.workspaceId] });
      toast.success('Invite code deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete invite code', {
        description: error.message,
      });
    },
  });
}

/**
 * Update invite code
 */
export function useUpdateInviteCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      codeId: string;
      workspaceId: string;
      updates: {
        description?: string;
        expiresAt?: string;
        maxUses?: number;
        requiresApproval?: boolean;
      };
    }) => {
      const response = await databases.updateDocument(
        DATABASE_ID,
        INVITE_CODES_COLLECTION_ID,
        data.codeId,
        data.updates
      );

      return response as unknown as InviteCode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invite-codes', data.workspaceId] });
      toast.success('Invite code updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update invite code', {
        description: error.message,
      });
    },
  });
}
