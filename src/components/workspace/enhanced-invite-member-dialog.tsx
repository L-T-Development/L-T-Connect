'use client';

import * as React from 'react';
import { UserPlus, Mail, KeyRound, Loader2, Copy, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/providers/auth-provider';
import { useCreateEmailInvitation, useCreateInviteCode } from '@/hooks/use-invitations';
import type { UserRole } from '@/types';
import { addDays, addHours, addMonths } from 'date-fns';
import { toast } from 'sonner';

interface EnhancedInviteMemberDialogProps {
  workspaceId: string;
  workspaceName: string;
  trigger?: React.ReactNode;
}

export function EnhancedInviteMemberDialog({
  workspaceId,
  workspaceName,
  trigger,
}: EnhancedInviteMemberDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'email' | 'code'>('email');

  // Email invitation state
  const [email, setEmail] = React.useState('');
  const [emailRole, setEmailRole] = React.useState<UserRole>('MEMBER');
  const [emailExpiration, setEmailExpiration] = React.useState<string>('7days');

  // Code invitation state
  const [codeRole, setCodeRole] = React.useState<UserRole>('MEMBER');
  const [codeExpiration, setCodeExpiration] = React.useState<string>('never');
  const [maxUses, setMaxUses] = React.useState<string>('unlimited');
  const [maxUsesCount, setMaxUsesCount] = React.useState<string>('10');
  const [requiresApproval, setRequiresApproval] = React.useState(true);
  const [codeDescription, setCodeDescription] = React.useState('');
  const [generatedCode, setGeneratedCode] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const createEmailInvitation = useCreateEmailInvitation();
  const createInviteCode = useCreateInviteCode();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to send invitations');
      return;
    }

    let expiresAt: string | undefined;
    if (emailExpiration !== 'never') {
      const now = new Date();
      switch (emailExpiration) {
        case '24hours':
          expiresAt = addHours(now, 24).toISOString();
          break;
        case '3days':
          expiresAt = addDays(now, 3).toISOString();
          break;
        case '7days':
          expiresAt = addDays(now, 7).toISOString();
          break;
        case '30days':
          expiresAt = addDays(now, 30).toISOString();
          break;
      }
    }

    try {
      await createEmailInvitation.mutateAsync({
        workspaceId,
        workspaceName,
        email,
        role: emailRole,
        invitedBy: user.$id,
        inviterName: user.name || user.email,
        expiresAt,
      });

      // Reset form
      setEmail('');
      setEmailRole('MEMBER');
      setEmailExpiration('7days');
      setOpen(false);
    } catch (error) {
      console.error('Failed to send email invitation:', error);
    }
  };

  const handleCodeGenerate = async () => {
    if (!user) {
      toast.error('You must be logged in to generate invite codes');
      return;
    }

    let expiresAt: string | undefined;
    if (codeExpiration !== 'never') {
      const now = new Date();
      switch (codeExpiration) {
        case '24hours':
          expiresAt = addHours(now, 24).toISOString();
          break;
        case '7days':
          expiresAt = addDays(now, 7).toISOString();
          break;
        case '30days':
          expiresAt = addDays(now, 30).toISOString();
          break;
        case '3months':
          expiresAt = addMonths(now, 3).toISOString();
          break;
      }
    }

    const maxUsesValue = maxUses === 'unlimited' ? undefined : parseInt(maxUsesCount, 10);

    try {
      const result = await createInviteCode.mutateAsync({
        workspaceId,
        workspaceName,
        role: codeRole,
        createdBy: user.$id,
        creatorName: user.name || user.email,
        expiresAt,
        maxUses: maxUsesValue,
        requiresApproval,
        description: codeDescription,
      });

      setGeneratedCode(result.code);
      
      // Reset form but keep the generated code visible
      setCodeRole('MEMBER');
      setCodeExpiration('never');
      setMaxUses('unlimited');
      setRequiresApproval(true);
      setCodeDescription('');
    } catch (error) {
      console.error('Failed to generate invite code:', error);
    }
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setGeneratedCode(null);
    setCopied(false);
    // Reset forms
    setEmail('');
    setEmailRole('MEMBER');
    setEmailExpiration('7days');
    setCodeRole('MEMBER');
    setCodeExpiration('never');
    setMaxUses('unlimited');
    setRequiresApproval(true);
    setCodeDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Choose how you want to invite members to join your workspace.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'email' | 'code')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">
              <Mail className="mr-2 h-4 w-4" />
              Invite via Email
            </TabsTrigger>
            <TabsTrigger value="code">
              <KeyRound className="mr-2 h-4 w-4" />
              Invite via Code
            </TabsTrigger>
          </TabsList>

          {/* Email Invitation Tab */}
          <TabsContent value="email" className="space-y-4">
            <form onSubmit={handleEmailSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The member will receive an email with an invitation link.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailRole">Assign Role *</Label>
                  <Select
                    value={emailRole}
                    onValueChange={(value) => setEmailRole(value as UserRole)}
                  >
                    <SelectTrigger id="emailRole">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="ASSISTANT_MANAGER">Assistant Manager</SelectItem>
                      <SelectItem value="SOFTWARE_DEVELOPER">Software Developer</SelectItem>
                      <SelectItem value="DEVELOPER_INTERN">Developer Intern</SelectItem>
                      <SelectItem value="TESTER">Tester</SelectItem>
                      <SelectItem value="CONTENT_ENGINEER">Content Engineer</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This role determines what the member can do in the workspace.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailExpiration">Invitation Expires</Label>
                  <Select value={emailExpiration} onValueChange={setEmailExpiration}>
                    <SelectTrigger id="emailExpiration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24hours">24 Hours</SelectItem>
                      <SelectItem value="3days">3 Days</SelectItem>
                      <SelectItem value="7days">7 Days (Recommended)</SelectItem>
                      <SelectItem value="30days">30 Days</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border p-4 bg-muted/50">
                  <p className="text-sm font-medium mb-2">What happens next?</p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>An invitation email will be sent immediately</li>
                    <li>The recipient clicks the link in the email</li>
                    <li>They create an account or sign in</li>
                    <li>They're automatically added to your workspace</li>
                  </ol>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={createEmailInvitation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createEmailInvitation.isPending}>
                  {createEmailInvitation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {/* Code Invitation Tab */}
          <TabsContent value="code" className="space-y-4">
            {generatedCode ? (
              // Show generated code
              <div className="space-y-4">
                <div className="rounded-lg border-2 border-primary p-6 bg-primary/5 text-center space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Your Invite Code</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-3xl font-bold tracking-wider">{generatedCode}</code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyCode}
                        className="h-8 w-8 p-0"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                    className="w-full"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Code
                  </Button>
                </div>

                <div className="rounded-lg border p-4 bg-muted/50">
                  <p className="text-sm font-medium mb-2">Share this code with:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Team members you want to invite</li>
                    <li>Post in your team chat or communication channel</li>
                    <li>Include in onboarding documentation</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-3">
                    {requiresApproval
                      ? 'Members using this code will need admin approval before joining.'
                      : 'Members using this code will be added automatically.'}
                  </p>
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setGeneratedCode(null)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generate Another
                  </Button>
                  <Button type="button" onClick={handleClose}>
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              // Show code generation form
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="codeRole">Default Role *</Label>
                  <Select
                    value={codeRole}
                    onValueChange={(value) => setCodeRole(value as UserRole)}
                  >
                    <SelectTrigger id="codeRole">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="ASSISTANT_MANAGER">Assistant Manager</SelectItem>
                      <SelectItem value="SOFTWARE_DEVELOPER">Software Developer</SelectItem>
                      <SelectItem value="DEVELOPER_INTERN">Developer Intern</SelectItem>
                      <SelectItem value="TESTER">Tester</SelectItem>
                      <SelectItem value="CONTENT_ENGINEER">Content Engineer</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Members joining with this code will get this role.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codeExpiration">Code Expires</Label>
                  <Select value={codeExpiration} onValueChange={setCodeExpiration}>
                    <SelectTrigger id="codeExpiration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24hours">24 Hours</SelectItem>
                      <SelectItem value="7days">7 Days</SelectItem>
                      <SelectItem value="30days">30 Days</SelectItem>
                      <SelectItem value="3months">3 Months</SelectItem>
                      <SelectItem value="never">Never (Recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxUses">Maximum Uses</Label>
                  <Select value={maxUses} onValueChange={setMaxUses}>
                    <SelectTrigger id="maxUses">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unlimited">Unlimited</SelectItem>
                      <SelectItem value="limited">Limited Uses</SelectItem>
                    </SelectContent>
                  </Select>
                  {maxUses === 'limited' && (
                    <Input
                      type="number"
                      min="1"
                      max="1000"
                      value={maxUsesCount}
                      onChange={(e) => setMaxUsesCount(e.target.value)}
                      placeholder="Enter max number of uses"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requiresApproval">Approval Required</Label>
                  <Select
                    value={requiresApproval ? 'yes' : 'no'}
                    onValueChange={(v) => setRequiresApproval(v === 'yes')}
                  >
                    <SelectTrigger id="requiresApproval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes - Require admin approval</SelectItem>
                      <SelectItem value="no">No - Add automatically</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {requiresApproval
                      ? 'Join requests will need to be approved by an admin.'
                      : 'Users will be added to the workspace immediately.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codeDescription">Description (Optional)</Label>
                  <Textarea
                    id="codeDescription"
                    placeholder="e.g., Code for Q1 2024 interns"
                    value={codeDescription}
                    onChange={(e) => setCodeDescription(e.target.value)}
                    rows={2}
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground">
                    {codeDescription.length}/200 characters
                  </p>
                </div>

                <div className="rounded-lg border p-4 bg-muted/50">
                  <p className="text-sm font-medium mb-2">How it works:</p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Generate a unique invite code</li>
                    <li>Share the code with people you want to invite</li>
                    <li>They enter the code when joining your workspace</li>
                    <li>
                      {requiresApproval
                        ? 'You approve their request to join'
                        : "They're added automatically"}
                    </li>
                  </ol>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={createInviteCode.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCodeGenerate}
                    disabled={createInviteCode.isPending}
                  >
                    {createInviteCode.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <KeyRound className="mr-2 h-4 w-4" />
                        Generate Code
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
