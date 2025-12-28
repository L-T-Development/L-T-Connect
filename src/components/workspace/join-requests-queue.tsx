'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Check, X, UserPlus, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  useWorkspaceJoinRequests,
  useApproveJoinRequest,
  useRejectJoinRequest,
} from '@/hooks/use-join-request';
import { useAddWorkspaceMember } from '@/hooks/use-workspace-roles';
import { useWorkspaceRoles } from '@/hooks/use-workspace-roles';
import type { JoinRequest } from '@/types';

interface JoinRequestsQueueProps {
  workspaceId: string;
  currentUserId: string;
  currentUserName: string;
}

export function JoinRequestsQueue({
  workspaceId,
  currentUserId,
  currentUserName,
}: JoinRequestsQueueProps) {
  const [approveDialogOpen, setApproveDialogOpen] = React.useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [selectedRequest, setSelectedRequest] = React.useState<JoinRequest | null>(null);
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>('');
  const [rejectionReason, setRejectionReason] = React.useState('');

  const { data: pendingRequests = [] } = useWorkspaceJoinRequests(workspaceId, 'PENDING');
  const { data: approvedRequests = [] } = useWorkspaceJoinRequests(workspaceId, 'APPROVED');
  const { data: rejectedRequests = [] } = useWorkspaceJoinRequests(workspaceId, 'REJECTED');
  const { data: roles = [] } = useWorkspaceRoles(workspaceId);

  const approveRequest = useApproveJoinRequest();
  const rejectRequest = useRejectJoinRequest();
  const addMember = useAddWorkspaceMember();

  const openApproveDialog = (request: JoinRequest) => {
    setSelectedRequest(request);
    setSelectedRoleId('');
    setApproveDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest || !selectedRoleId) {
      toast.error('Please select a role for the new member');
      return;
    }

    const selectedRole = roles.find((r) => r.$id === selectedRoleId);
    if (!selectedRole) {
      toast.error('Selected role not found');
      return;
    }

    try {
      // First approve the join request
      await approveRequest.mutateAsync({
        requestId: selectedRequest.$id,
        workspaceId: selectedRequest.workspaceId,
        userId: selectedRequest.userId,
        processorId: currentUserId,
        processorName: currentUserName,
      });

      // Then add user as workspace member with the selected role
      await addMember.mutateAsync({
        workspaceId: selectedRequest.workspaceId,
        userId: selectedRequest.userId,
        userName: selectedRequest.userName,
        userEmail: selectedRequest.userEmail,
        userAvatar: selectedRequest.userAvatar,
        roleId: selectedRoleId,
        roleName: selectedRole.name,
        invitedBy: currentUserId,
      });

      toast.success(`Approved join request from ${selectedRequest.userName}`, {
        description: `User has been added with ${selectedRole.name} role.`,
      });

      setApproveDialogOpen(false);
      setSelectedRequest(null);
      setSelectedRoleId('');
    } catch (error) {
      console.error('Error approving join request:', error);
      toast.error('Failed to approve join request', {
        description: 'Please try again later.',
      });
    }
  };

  const openRejectDialog = (request: JoinRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      await rejectRequest.mutateAsync({
        requestId: selectedRequest.$id,
        workspaceId: selectedRequest.workspaceId,
        userId: selectedRequest.userId,
        processorId: currentUserId,
        processorName: currentUserName,
        rejectionReason: rejectionReason.trim(),
      });

      toast.success(`Rejected join request from ${selectedRequest.userName}`);
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting join request:', error);
      toast.error('Failed to reject join request', {
        description: 'Please try again later.',
      });
    }
  };

  const RequestCard = ({
    request,
    showActions = true,
  }: {
    request: JoinRequest;
    showActions?: boolean;
  }) => (
    <Card key={request.$id}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* User Info */}
          <div className="flex items-start gap-4 flex-1">
            <Avatar className="h-12 w-12">
              <AvatarImage src={request.userAvatar} alt={request.userName} />
              <AvatarFallback>
                {request.userName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2">
              <div>
                <h4 className="font-semibold">{request.userName}</h4>
                <p className="text-sm text-muted-foreground">{request.userEmail}</p>
              </div>

              {request.message && (
                <div className="rounded-lg border p-3 bg-muted/50">
                  <p className="text-sm">{request.message}</p>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Requested{' '}
                    {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true })}
                  </span>
                </div>
                {request.processedAt && (
                  <div className="flex items-center gap-1">
                    {request.status === 'APPROVED' ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-destructive" />
                    )}
                    <span>
                      {request.status === 'APPROVED' ? 'Approved' : 'Rejected'} by{' '}
                      {request.processorName}{' '}
                      {formatDistanceToNow(new Date(request.processedAt), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>

              {request.status === 'REJECTED' && request.rejectionReason && (
                <div className="rounded-lg border border-destructive/50 p-3 bg-destructive/5">
                  <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                  <p className="text-sm text-muted-foreground mt-1">{request.rejectionReason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Status Badge or Actions */}
          <div className="flex items-start gap-2">
            {!showActions && request.status === 'APPROVED' && (
              <Badge className="bg-green-500">
                <Check className="h-3 w-3 mr-1" />
                Approved
              </Badge>
            )}
            {!showActions && request.status === 'REJECTED' && (
              <Badge variant="destructive">
                <X className="h-3 w-3 mr-1" />
                Rejected
              </Badge>
            )}
            {showActions && request.status === 'PENDING' && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => openApproveDialog(request)}
                  disabled={approveRequest.isPending || addMember.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => openRejectDialog(request)}
                  disabled={rejectRequest.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Join Requests
              </CardTitle>
              <CardDescription>Manage workspace membership requests</CardDescription>
            </div>
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {pendingRequests.length} Pending
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({approvedRequests.length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({rejectedRequests.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No Pending Requests</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    All join requests have been processed
                  </p>
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <RequestCard key={request.$id} request={request} showActions />
                ))
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4">
              {approvedRequests.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No Approved Requests</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Approved requests will appear here
                  </p>
                </div>
              ) : (
                approvedRequests.map((request) => (
                  <RequestCard key={request.$id} request={request} showActions={false} />
                ))
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4">
              {rejectedRequests.length === 0 ? (
                <div className="text-center py-12">
                  <XCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No Rejected Requests</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Rejected requests will appear here
                  </p>
                </div>
              ) : (
                rejectedRequests.map((request) => (
                  <RequestCard key={request.$id} request={request} showActions={false} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Approve Dialog with Role Selection */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Join Request</DialogTitle>
            <DialogDescription>
              Select a role for {selectedRequest?.userName} and approve their join request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* User Info */}
            {selectedRequest && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedRequest.userAvatar} alt={selectedRequest.userName} />
                  <AvatarFallback>
                    {selectedRequest.userName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedRequest.userName}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.userEmail}</p>
                </div>
              </div>
            )}

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role">Assign Role *</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.$id} value={role.$id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{role.name}</span>
                        {role.description && (
                          <span className="text-xs text-muted-foreground">{role.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This role will determine the user's permissions in the workspace
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              disabled={approveRequest.isPending || addMember.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={!selectedRoleId || approveRequest.isPending || addMember.isPending}
            >
              {approveRequest.isPending || addMember.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Approve & Add Member
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Join Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedRequest?.userName}'s join request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Explain why this request is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              className="mt-2 sm:mt-0"
              onClick={() => setRejectDialogOpen(false)}
              disabled={rejectRequest.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectRequest.isPending}
            >
              {rejectRequest.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Reject Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
