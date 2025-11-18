'use client';

import * as React from 'react';
import { Loader2, UserPlus, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useCreateJoinRequest } from '@/hooks/use-join-request';
import { databases } from '@/lib/appwrite-client';
import { Query } from 'appwrite';

interface JoinWorkspaceDialogProps {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  trigger?: React.ReactNode;
}

export function JoinWorkspaceDialog({
  userId,
  userName,
  userEmail,
  userAvatar,
  trigger,
}: JoinWorkspaceDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [isValidating, setIsValidating] = React.useState(false);
  const [validationError, setValidationError] = React.useState('');
  const [workspaceInfo, setWorkspaceInfo] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  const createJoinRequest = useCreateJoinRequest();

  // Validate invite code
  const validateInviteCode = async (code: string) => {
    if (!code || code.length < 6) {
      setValidationError('Invalid invite code format');
      setWorkspaceInfo(null);
      return;
    }

    setIsValidating(true);
    setValidationError('');

    try {
      // Find workspace by invite code
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_WORKSPACES_ID!,
        [Query.equal('inviteCode', code), Query.limit(1)]
      );

      if (response.documents.length === 0) {
        setValidationError('Invalid invite code. Workspace not found.');
        setWorkspaceInfo(null);
      } else {
        const workspace = response.documents[0];
        setWorkspaceInfo({
          id: workspace.$id,
          name: workspace.name as string,
        });
        setValidationError('');
      }
    } catch (error) {
      console.error('Error validating invite code:', error);
      setValidationError('Failed to validate invite code. Please try again.');
      setWorkspaceInfo(null);
    } finally {
      setIsValidating(false);
    }
  };

  // Debounce validation
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (inviteCode) {
        validateInviteCode(inviteCode);
      } else {
        setWorkspaceInfo(null);
        setValidationError('');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workspaceInfo) {
      toast.error('Please enter a valid invite code');
      return;
    }

    try {
      await createJoinRequest.mutateAsync({
        workspaceId: workspaceInfo.id,
        workspaceName: workspaceInfo.name,
        userId,
        userName,
        userEmail,
        userAvatar,
        inviteCode,
        message: message.trim(),
      });

      toast.success('Join request sent successfully!', {
        description: 'The workspace admin will review your request.',
      });

      setOpen(false);
      setInviteCode('');
      setMessage('');
      setWorkspaceInfo(null);

      // Optionally navigate to a pending requests page
      // router.push('/join-requests');
    } catch (error) {
      console.error('Error creating join request:', error);
      toast.error('Failed to send join request', {
        description: 'Please try again later.',
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setInviteCode('');
    setMessage('');
    setValidationError('');
    setWorkspaceInfo(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Join Workspace
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Join a Workspace</DialogTitle>
            <DialogDescription>
              Enter the invite code provided by the workspace admin to request access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Invite Code Input */}
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code *</Label>
              <div className="relative">
                <Input
                  id="inviteCode"
                  placeholder="Enter 6-character invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  required
                  className="pr-10"
                />
                {isValidating && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!isValidating && workspaceInfo && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                )}
                {!isValidating && validationError && inviteCode && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-destructive" />
                  </div>
                )}
              </div>
              {validationError && inviteCode && (
                <p className="text-sm text-destructive">{validationError}</p>
              )}
              {workspaceInfo && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <Check className="h-4 w-4" />
                  <span>
                    Found workspace: <strong>{workspaceInfo.name}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Introduce yourself and explain why you'd like to join..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {message.length}/500 characters
              </p>
            </div>

            {/* User Info Preview */}
            <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
              <p className="text-sm font-medium">Your Profile</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium">Name:</span> {userName}
                </p>
                <p>
                  <span className="font-medium">Email:</span> {userEmail}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createJoinRequest.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !workspaceInfo ||
                isValidating ||
                createJoinRequest.isPending ||
                !!validationError
              }
            >
              {createJoinRequest.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Request...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Join Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
