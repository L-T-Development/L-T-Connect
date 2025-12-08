"use client";

import * as React from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useCurrentWorkspace } from "@/hooks/use-current-workspace";
import { useTheme } from "next-themes";
import { DeleteWorkspaceDialog } from "@/components/workspace/delete-workspace-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Settings as SettingsIcon,
  Globe,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import NotificationPreferences from "@/components/settings/notification-preferences";
import { useIsManager } from '@/hooks/use-permissions';
import { Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { currentWorkspace, isLoading: workspacesLoading } = useCurrentWorkspace();
  const { theme, setTheme, systemTheme } = useTheme();

  const [mounted, setMounted] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [compactMode, setCompactMode] = React.useState(false);
  const [showAnimations, setShowAnimations] = React.useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const isManager = useIsManager(); // RBAC check

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);

    // Load display preferences from localStorage
    const compactModeStored = localStorage.getItem('compact-mode') === 'true';
    const noAnimations = localStorage.getItem('no-animations') === 'true';

    setCompactMode(compactModeStored);
    setShowAnimations(!noAnimations);

    // Apply stored preferences
    if (compactModeStored) {
      document.documentElement.classList.add('compact-mode');
    }
    if (noAnimations) {
      document.documentElement.classList.add('no-animations');
    }
  }, []);

  // Get actual current theme (resolving system preference)
  const currentTheme = theme === 'system' ? systemTheme : theme;

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdating(true);

    // Simulate update
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.success('Profile updated successfully');
    setIsUpdating(false);
  };

  const handleWorkspaceUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdating(true);

    // Simulate update
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.success('Workspace settings updated successfully');
    setIsUpdating(false);
  };

  if (workspacesLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <SettingsIcon className="h-16 w-16 text-muted-foreground/50 mx-auto" />
          <h2 className="text-2xl font-semibold">No Workspace Found</h2>
          <p className="text-muted-foreground">Create a workspace to access settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and workspace preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and profile picture</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="text-2xl">
                      {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button type="button" variant="outline" size="sm">
                      Change Avatar
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      JPG, GIF or PNG. Max size of 2MB.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue={user?.name} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue={user?.email} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell us about yourself..."
                      rows={4}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workspace Tab - Manager Only */}
        <TabsContent value="workspace" className="space-y-4">
          {!isManager ? (
            <Card className="border-destructive/50">
              <CardHeader>
                <div className="flex items-center gap-2 text-destructive">
                  <Shield className="h-6 w-6" />
                  <CardTitle>Access Denied</CardTitle>
                </div>
                <CardDescription>
                  You don&apos;t have permission to access workspace settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Only workspace managers and administrators can manage workspace settings,
                  including renaming and deleting the workspace.
                </p>
                <p className="text-sm text-muted-foreground">
                  Please contact your workspace administrator if you need to make changes.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Workspace Settings</CardTitle>
                  <CardDescription>Manage workspace details and configuration</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleWorkspaceUpdate} className="space-y-6">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="workspace-name">Workspace Name</Label>
                        <Input id="workspace-name" defaultValue={currentWorkspace.name} />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="workspace-desc">Description</Label>
                        <Textarea
                          id="workspace-desc"
                          defaultValue={currentWorkspace.description}
                          rows={3}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="invite-code">Invite Code</Label>
                        <div className="flex gap-2">
                          <Input
                            id="invite-code"
                            defaultValue={currentWorkspace.inviteCode}
                            readOnly
                          />
                          <Button type="button" variant="outline">
                            Regenerate
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Share this code to invite team members
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Workspace Preferences</h3>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Allow member invites</Label>
                          <p className="text-sm text-muted-foreground">
                            Let team members invite others
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Public workspace</Label>
                          <p className="text-sm text-muted-foreground">
                            Make workspace visible to public
                          </p>
                        </div>
                        <Switch />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Require approval for tasks</Label>
                          <p className="text-sm text-muted-foreground">
                            Tasks need approval before completion
                          </p>
                        </div>
                        <Switch />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={isUpdating}>
                        {isUpdating ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="border-red-200 dark:border-red-900">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions for this workspace</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete Workspace</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete this workspace and all its data
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <NotificationPreferences />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security and privacy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Password</h3>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input id="confirm-password" type="password" />
                  </div>
                </div>

                <Button>Change Password</Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Two-Factor Authentication</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable 2FA</Label>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize the look and feel of your workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Theme</h3>
                <p className="text-sm text-muted-foreground">
                  Select the theme for the application
                  {mounted && theme === 'system' && ` (currently using ${currentTheme} mode)`}
                </p>

                {mounted ? (
                  <RadioGroup value={theme} onValueChange={(value) => setTheme(value)} className="grid gap-4">
                    <div className={`flex items-center justify-between p-4 rounded-lg border ${theme === 'light' ? 'border-primary bg-primary/5' : ''}`}>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="light" id="light" />
                        <Label htmlFor="light" className="cursor-pointer flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-white dark:bg-gray-800 border-2 shadow-sm" />
                          <div>
                            <p className="font-medium">Light</p>
                            <p className="text-sm text-muted-foreground">Light color scheme</p>
                          </div>
                        </Label>
                      </div>
                    </div>

                    <div className={`flex items-center justify-between p-4 rounded-lg border ${theme === 'dark' ? 'border-primary bg-primary/5' : ''}`}>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="dark" id="dark" />
                        <Label htmlFor="dark" className="cursor-pointer flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-gray-900 border-2 shadow-sm" />
                          <div>
                            <p className="font-medium">Dark</p>
                            <p className="text-sm text-muted-foreground">Dark color scheme</p>
                          </div>
                        </Label>
                      </div>
                    </div>

                    <div className={`flex items-center justify-between p-4 rounded-lg border ${theme === 'system' ? 'border-primary bg-primary/5' : ''}`}>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="system" id="system" />
                        <Label htmlFor="system" className="cursor-pointer flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-gradient-to-br from-white via-gray-500 to-gray-900 border-2 shadow-sm" />
                          <div>
                            <p className="font-medium">System</p>
                            <p className="text-sm text-muted-foreground">Follow system preference</p>
                          </div>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="text-sm text-muted-foreground">Loading theme settings...</div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Display</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Compact mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Use smaller spacing between elements
                    </p>
                  </div>
                  <Switch
                    checked={compactMode}
                    onCheckedChange={(checked) => {
                      setCompactMode(checked);
                      if (checked) {
                        document.documentElement.classList.add('compact-mode');
                        localStorage.setItem('compact-mode', 'true');
                        toast.success('Compact mode enabled');
                      } else {
                        document.documentElement.classList.remove('compact-mode');
                        localStorage.removeItem('compact-mode');
                        toast.success('Compact mode disabled');
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show animations</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable interface animations
                    </p>
                  </div>
                  <Switch
                    checked={showAnimations}
                    onCheckedChange={(checked) => {
                      setShowAnimations(checked);
                      if (checked) {
                        document.documentElement.classList.remove('no-animations');
                        localStorage.removeItem('no-animations');
                        toast.success('Animations enabled');
                      } else {
                        document.documentElement.classList.add('no-animations');
                        localStorage.setItem('no-animations', 'true');
                        toast.success('Animations disabled');
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Workspace Dialog */}
      <DeleteWorkspaceDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  );
}
