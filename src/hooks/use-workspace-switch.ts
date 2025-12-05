import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

/**
 * Hook to handle workspace switching with proper cache invalidation
 * This ensures no data leakage between workspaces
 */
export function useWorkspaceSwitch() {
    const queryClient = useQueryClient();

    const switchWorkspace = useCallback((newWorkspaceId: string, workspaceName?: string) => {
        // 1. Clear ALL workspace-scoped queries to prevent data leakage
        queryClient.removeQueries({ queryKey: ['projects'] });
        queryClient.removeQueries({ queryKey: ['project'] });
        queryClient.removeQueries({ queryKey: ['tasks'] });
        queryClient.removeQueries({ queryKey: ['task'] });
        queryClient.removeQueries({ queryKey: ['workspace-tasks'] });
        queryClient.removeQueries({ queryKey: ['epics'] });
        queryClient.removeQueries({ queryKey: ['epic'] });
        queryClient.removeQueries({ queryKey: ['sprints'] });
        queryClient.removeQueries({ queryKey: ['sprint'] });
        queryClient.removeQueries({ queryKey: ['workspace-sprints'] });
        queryClient.removeQueries({ queryKey: ['requirements'] });
        queryClient.removeQueries({ queryKey: ['functional-requirements'] });
        queryClient.removeQueries({ queryKey: ['functional-requirement'] });
        queryClient.removeQueries({ queryKey: ['client-requirements'] });
        queryClient.removeQueries({ queryKey: ['client-requirement'] });
        queryClient.removeQueries({ queryKey: ['attendance'] });
        queryClient.removeQueries({ queryKey: ['leave-requests'] });
        queryClient.removeQueries({ queryKey: ['leave-request'] });
        queryClient.removeQueries({ queryKey: ['notifications'] });
        queryClient.removeQueries({ queryKey: ['unread-count'] });
        queryClient.removeQueries({ queryKey: ['analytics'] });
        queryClient.removeQueries({ queryKey: ['workspace-analytics'] });
        queryClient.removeQueries({ queryKey: ['team'] });
        queryClient.removeQueries({ queryKey: ['workspace-members'] });
        queryClient.removeQueries({ queryKey: ['activity'] });
        queryClient.removeQueries({ queryKey: ['activity-logs'] });
        queryClient.removeQueries({ queryKey: ['comments'] });
        queryClient.removeQueries({ queryKey: ['task-comments'] });
        queryClient.removeQueries({ queryKey: ['time-entries'] });
        queryClient.removeQueries({ queryKey: ['active-timers'] });
        queryClient.removeQueries({ queryKey: ['join-requests'] });
        queryClient.removeQueries({ queryKey: ['invitations'] });
        queryClient.removeQueries({ queryKey: ['saved-searches'] });
        queryClient.removeQueries({ queryKey: ['global-search'] });

        // 2. Update current workspace in localStorage for persistence
        localStorage.setItem('currentWorkspaceId', newWorkspaceId);

        // 3. Invalidate the new workspace query to trigger fresh data fetch
        queryClient.invalidateQueries({ queryKey: ['workspace', newWorkspaceId] });

        // 4. Show success message
        if (workspaceName) {
            toast({
                title: 'Workspace Switched',
                description: `Now viewing ${workspaceName}`,
            });
        }
    }, [queryClient]);

    /**
     * Clear all cached data (nuclear option)
     * Use this if selective clearing doesn't work
     */
    const clearAllCache = useCallback(() => {
        queryClient.clear();
        toast({
            title: 'Cache Cleared',
            description: 'All cached data has been cleared',
        });
    }, [queryClient]);

    return {
        switchWorkspace,
        clearAllCache
    };
}
