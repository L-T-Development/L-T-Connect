import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query, ID } from 'appwrite';
import { toast } from '@/hooks/use-toast';
import type { TaskFilters } from '@/components/search/advanced-filters';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const SAVED_SEARCHES_COLLECTION_ID = 'saved_searches'; // You'll need to create this collection

export interface SavedSearch {
  $id: string;
  workspaceId: string;
  userId: string;
  name: string;
  description?: string;
  filters: TaskFilters;
  isGlobal: boolean; // Shared with workspace or personal
  useCount: number;
  $createdAt: string;
  $updatedAt: string;
}

export function useSavedSearches(workspaceId?: string, userId?: string) {
  return useQuery({
    queryKey: ['saved-searches', workspaceId, userId],
    queryFn: async () => {
      if (!workspaceId || !userId) return [];

      const response = await databases.listDocuments(
        DATABASE_ID,
        SAVED_SEARCHES_COLLECTION_ID,
        [
          Query.equal('workspaceId', workspaceId),
          Query.or([
            Query.equal('userId', userId),
            Query.equal('isGlobal', true),
          ]),
          Query.orderDesc('useCount'),
        ]
      );

      return response.documents.map(doc => ({
        ...doc,
        filters: typeof doc.filters === 'string' ? JSON.parse(doc.filters) : doc.filters,
      })) as unknown as SavedSearch[];
    },
    enabled: !!workspaceId && !!userId,
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      userId: string;
      name: string;
      description?: string;
      filters: TaskFilters;
      isGlobal: boolean;
    }) => {
      const searchData = {
        workspaceId: data.workspaceId,
        userId: data.userId,
        name: data.name,
        description: data.description || '',
        filters: JSON.stringify(data.filters),
        isGlobal: data.isGlobal,
        useCount: 0,
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        SAVED_SEARCHES_COLLECTION_ID,
        ID.unique(),
        searchData
      );

      return response as unknown as SavedSearch;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['saved-searches', variables.workspaceId, variables.userId],
      });
      toast({
        title: 'Success',
        description: 'Search saved successfully!',
      });
    },
    onError: (error: Error) => {
      // Check if collection doesn't exist
      if ((error instanceof Error ? error.message : String(error))?.includes('Collection with the requested ID could not be found')) {
        toast({
          title: 'Collection Not Found',
          description: 'Please create the "saved_searches" collection in Appwrite. See documentation for schema.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: (error instanceof Error ? error.message : String(error)) || 'Failed to save search',
          variant: 'destructive',
        });
      }
    },
  });
}

export function useUpdateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      searchId: string;
      workspaceId: string;
      userId: string;
      updates: Partial<SavedSearch>;
    }) => {
      const { searchId, updates } = data;

      const processedUpdates: any = { ...updates };
      if (updates.filters) {
        processedUpdates.filters = JSON.stringify(updates.filters);
      }

      const response = await databases.updateDocument(
        DATABASE_ID,
        SAVED_SEARCHES_COLLECTION_ID,
        searchId,
        processedUpdates
      );

      return response as unknown as SavedSearch;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['saved-searches', variables.workspaceId, variables.userId],
      });
      toast({
        title: 'Success',
        description: 'Search updated successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to update search',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      searchId: string;
      workspaceId: string;
      userId: string;
    }) => {
      await databases.deleteDocument(
        DATABASE_ID,
        SAVED_SEARCHES_COLLECTION_ID,
        data.searchId
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['saved-searches', data.workspaceId, data.userId],
      });
      toast({
        title: 'Success',
        description: 'Search deleted successfully!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: (error instanceof Error ? error.message : String(error)) || 'Failed to delete search',
        variant: 'destructive',
      });
    },
  });
}

export function useIncrementSearchUseCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      searchId: string;
      workspaceId: string;
      userId: string;
      currentCount: number;
    }) => {
      await databases.updateDocument(
        DATABASE_ID,
        SAVED_SEARCHES_COLLECTION_ID,
        data.searchId,
        { useCount: data.currentCount + 1 }
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['saved-searches', data.workspaceId, data.userId],
      });
    },
  });
}
