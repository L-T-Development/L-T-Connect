'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useWorkspaces } from '@/hooks/use-workspace';
import { Loader2 } from 'lucide-react';

export function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces(user?.$id);

  useEffect(() => {
    if (!authLoading && !workspacesLoading) {
      // If user is logged in but has no workspaces, redirect to onboarding
      if (user && (!workspaces || workspaces.length === 0)) {
        router.push('/onboarding');
      }
    }
  }, [user, workspaces, authLoading, workspacesLoading, router]);

  // Show loading while checking
  if (authLoading || workspacesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If no workspaces, don't render children (redirect will happen)
  if (!workspaces || workspaces.length === 0) {
    return null;
  }

  return <>{children}</>;
}
