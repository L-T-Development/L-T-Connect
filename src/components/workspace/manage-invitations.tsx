'use client';

import * as React from 'react';
import {
  Mail,
  KeyRound,
  Clock,
  CheckCircle2,
  MoreVertical,
  Send,
  Ban,
  Trash2,
  Copy,
  Edit,
  Users,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useEmailInvitations,
  useInviteCodes,
  useRevokeEmailInvitation,
  useResendEmailInvitation,
  useRevokeInviteCode,
  useDeleteInviteCode,
} from '@/hooks/use-invitations';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import { toast } from 'sonner';

interface ManageInvitationsProps {
  workspaceId: string;
  currentUserId: string;
}

export function ManageInvitations({ workspaceId, currentUserId }: ManageInvitationsProps) {
  const [revokeDialogOpen, setRevokeDialogOpen] = React.useState(false);
  const [revokingItem, setRevokingItem] = React.useState<{
    type: 'email' | 'code';
    id: string;
  } | null>(null);
  const [revokeReason, setRevokeReason] = React.useState('');

  const { data: emailInvitations = [], isLoading: emailLoading } = useEmailInvitations(workspaceId);
  const { data: inviteCodes = [], isLoading: codesLoading } = useInviteCodes(workspaceId);

  const revokeEmail = useRevokeEmailInvitation();
  const resendEmail = useResendEmailInvitation();
  const revokeCode = useRevokeInviteCode();
  const deleteCode = useDeleteInviteCode();

  // Calculate statistics
  const stats = React.useMemo(() => {
    const pendingEmails = emailInvitations.filter((inv) => inv.status === 'PENDING').length;
    const acceptedEmails = emailInvitations.filter((inv) => inv.status === 'ACCEPTED').length;
    const expiredEmails = emailInvitations.filter(
      (inv) => inv.status === 'PENDING' && inv.expiresAt && isPast(new Date(inv.expiresAt))
    ).length;

    const activeCodes = inviteCodes.filter((code) => code.status === 'ACTIVE').length;
    const expiredCodes = inviteCodes.filter(
      (code) => code.status === 'ACTIVE' && code.expiresAt && isPast(new Date(code.expiresAt))
    ).length;
    const totalUses = inviteCodes.reduce((sum, code) => sum + code.currentUses, 0);

    return {
      pendingEmails,
      acceptedEmails,
      expiredEmails,
      activeCodes,
      expiredCodes,
      totalUses,
    };
  }, [emailInvitations, inviteCodes]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  const handleResendEmail = async (invitationId: string) => {
    try {
      await resendEmail.mutateAsync(invitationId);
    } catch (error) {
      console.error('Failed to resend email:', error);
    }
  };

  const handleRevokeClick = (type: 'email' | 'code', id: string) => {
    setRevokingItem({ type, id });
    setRevokeDialogOpen(true);
  };

  const handleRevokeConfirm = async () => {
    if (!revokingItem) return;

    try {
      if (revokingItem.type === 'email') {
        await revokeEmail.mutateAsync({
          invitationId: revokingItem.id,
          revokedBy: currentUserId,
          reason: revokeReason,
        });
      } else {
        await revokeCode.mutateAsync({
          codeId: revokingItem.id,
          revokedBy: currentUserId,
          reason: revokeReason,
        });
      }

      setRevokeDialogOpen(false);
      setRevokingItem(null);
      setRevokeReason('');
    } catch (error) {
      console.error('Failed to revoke:', error);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (
      confirm('Are you sure you want to delete this invite code? This action cannot be undone.')
    ) {
      try {
        await deleteCode.mutateAsync({ codeId, workspaceId });
      } catch (error) {
        console.error('Failed to delete code:', error);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'ACTIVE':
        return <Badge variant="default">{status}</Badge>;
      case 'ACCEPTED':
        return (
          <Badge variant="default" className="bg-green-500">
            {status}
          </Badge>
        );
      case 'REJECTED':
        return <Badge variant="destructive">{status}</Badge>;
      case 'EXPIRED':
        return <Badge variant="secondary">{status}</Badge>;
      case 'REVOKED':
        return <Badge variant="outline">{status}</Badge>;
      case 'DEPLETED':
        return <Badge variant="secondary">DEPLETED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isExpired = (expiresAt?: string) => {
    return expiresAt && isPast(new Date(expiresAt));
  };

  if (emailLoading || codesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading invitations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingEmails}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Codes</CardTitle>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCodes}</div>
            <p className="text-xs text-muted-foreground">{stats.totalUses} total uses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.acceptedEmails}</div>
            <p className="text-xs text-muted-foreground">Successfully joined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiredEmails + stats.expiredCodes}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Invitations Tabs */}
      <Tabs defaultValue="emails" className="space-y-4">
        <TabsList>
          <TabsTrigger value="emails">
            <Mail className="h-4 w-4 mr-2" />
            Email Invitations ({emailInvitations.length})
          </TabsTrigger>
          <TabsTrigger value="codes">
            <KeyRound className="h-4 w-4 mr-2" />
            Invite Codes ({inviteCodes.length})
          </TabsTrigger>
        </TabsList>

        {/* Email Invitations Tab */}
        <TabsContent value="emails" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Invitations</CardTitle>
              <CardDescription>Manage email invitations sent to specific people</CardDescription>
            </CardHeader>
            <CardContent>
              {emailInvitations.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No email invitations sent yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailInvitations.map((invitation) => (
                      <TableRow key={invitation.$id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{invitation.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(
                              isExpired(invitation.expiresAt) ? 'EXPIRED' : invitation.status
                            )}
                            {isExpired(invitation.expiresAt) && (
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(invitation.$createdAt), {
                              addSuffix: true,
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {invitation.expiresAt ? (
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(invitation.expiresAt), 'MMM dd, yyyy')}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {invitation.status === 'PENDING' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleResendEmail(invitation.$id)}
                                    disabled={resendEmail.isPending}
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    Resend Email
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleCopyCode(invitation.inviteCode)}
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Invite Code
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {invitation.status === 'PENDING' && (
                                <DropdownMenuItem
                                  onClick={() => handleRevokeClick('email', invitation.$id)}
                                  className="text-destructive"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Revoke Invitation
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invite Codes Tab */}
        <TabsContent value="codes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invite Codes</CardTitle>
              <CardDescription>Manage reusable invite codes for your workspace</CardDescription>
            </CardHeader>
            <CardContent>
              {inviteCodes.length === 0 ? (
                <div className="text-center py-12">
                  <KeyRound className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No invite codes created yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inviteCodes.map((code) => {
                      const expired = isExpired(code.expiresAt);
                      const depleted = code.maxUses && code.currentUses >= code.maxUses;

                      return (
                        <TableRow key={code.$id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="font-bold text-base tracking-wider">
                                {code.code}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyCode(code.code)}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            {code.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {code.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{code.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(
                                expired ? 'EXPIRED' : depleted ? 'DEPLETED' : code.status
                              )}
                              {code.requiresApproval && (
                                <Badge variant="secondary" className="text-xs">
                                  Approval Required
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">
                                {code.currentUses}
                                {code.maxUses ? ` / ${code.maxUses}` : ''}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(code.$createdAt), 'MMM dd, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            {code.expiresAt ? (
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(code.expiresAt), 'MMM dd, yyyy')}
                                {expired && (
                                  <AlertCircle className="h-4 w-4 text-orange-500 inline-block ml-1" />
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Never</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleCopyCode(code.code)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Code
                                </DropdownMenuItem>
                                {code.status === 'ACTIVE' && (
                                  <>
                                    <DropdownMenuItem disabled>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Settings
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleRevokeClick('code', code.$id)}
                                      className="text-destructive"
                                    >
                                      <Ban className="h-4 w-4 mr-2" />
                                      Revoke Code
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleDeleteCode(code.$id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Code
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Revoke Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Revoke {revokingItem?.type === 'email' ? 'Invitation' : 'Code'}
            </DialogTitle>
            <DialogDescription>
              This will prevent the {revokingItem?.type === 'email' ? 'invitation' : 'code'} from
              being used. Please provide a reason for revoking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="revokeReason">Reason for revoking</Label>
            <Textarea
              id="revokeReason"
              placeholder="e.g., Position filled, No longer needed"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between sm:space-x-0">
            <Button
              variant="outline"
              className="mt-2 sm:mt-0"
              onClick={() => {
                setRevokeDialogOpen(false);
                setRevokingItem(null);
                setRevokeReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeConfirm}
              disabled={revokeEmail.isPending || revokeCode.isPending}
            >
              {revokeEmail.isPending || revokeCode.isPending ? 'Revoking...' : 'Revoke'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
