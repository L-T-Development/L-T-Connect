import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query, ID } from 'appwrite';
import { Holiday, HolidayType } from '@/types';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from '@/hooks/use-toast';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const HOLIDAYS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_HOLIDAYS_COLLECTION_ID!;

// ============================================================================
// Holiday Hooks
// ============================================================================

/**
 * Get all holidays for a specific year
 */
export function useHolidays(workspaceId?: string, year?: number) {
    const currentYear = year ?? new Date().getFullYear();
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    return useQuery({
        queryKey: ['holidays', workspaceId, currentYear],
        queryFn: async () => {
            if (!workspaceId) return [];

            const response = await databases.listDocuments(
                DATABASE_ID,
                HOLIDAYS_COLLECTION_ID,
                [
                    Query.equal('workspaceId', workspaceId),
                    Query.greaterThanEqual('date', startDate),
                    Query.lessThanEqual('date', endDate),
                    Query.orderAsc('date'),
                    Query.limit(100),
                ]
            );

            return response.documents as unknown as Holiday[];
        },
        enabled: !!workspaceId,
    });
}

/**
 * Get holidays within a date range
 */
export function useHolidaysByDateRange(
    workspaceId?: string,
    startDate?: string,
    endDate?: string
) {
    return useQuery({
        queryKey: ['holidays', workspaceId, startDate, endDate],
        queryFn: async () => {
            if (!workspaceId || !startDate || !endDate) return [];

            const response = await databases.listDocuments(
                DATABASE_ID,
                HOLIDAYS_COLLECTION_ID,
                [
                    Query.equal('workspaceId', workspaceId),
                    Query.greaterThanEqual('date', startDate),
                    Query.lessThanEqual('date', endDate),
                    Query.orderAsc('date'),
                    Query.limit(100),
                ]
            );

            return response.documents as unknown as Holiday[];
        },
        enabled: !!workspaceId && !!startDate && !!endDate,
    });
}

/**
 * Create a new holiday
 * Manager-only operation
 */
export function useCreateHoliday() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (data: {
            workspaceId: string;
            name: string;
            date: string;
            type: HolidayType;
            description?: string;
            recurring: boolean;
        }) => {
            const now = new Date().toISOString();

            const holiday = await databases.createDocument(
                DATABASE_ID,
                HOLIDAYS_COLLECTION_ID,
                ID.unique(),
                {
                    ...data,
                    createdBy: user?.$id || '',
                    createdAt: now,
                    updatedAt: now,
                }
            );

            return holiday as unknown as Holiday;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['holidays', variables.workspaceId] });
            toast({
                title: 'Holiday Created',
                description: `${variables.name} has been added to the calendar.`,
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Failed to Create Holiday',
                description: error.message || 'Could not create holiday. Please try again.',
                variant: 'destructive',
            });
        },
    });
}

/**
 * Update an existing holiday
 * Manager-only operation
 */
export function useUpdateHoliday() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            holidayId: string;
            workspaceId: string;
            name?: string;
            date?: string;
            type?: HolidayType;
            description?: string;
            recurring?: boolean;
        }) => {
            const { holidayId, workspaceId, ...updateData } = data;
            const now = new Date().toISOString();

            const holiday = await databases.updateDocument(
                DATABASE_ID,
                HOLIDAYS_COLLECTION_ID,
                holidayId,
                {
                    ...updateData,
                    updatedAt: now,
                }
            );

            return { holiday: holiday as unknown as Holiday, workspaceId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['holidays', data.workspaceId] });
            toast({
                title: 'Holiday Updated',
                description: 'Holiday has been updated successfully.',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Failed to Update Holiday',
                description: error.message || 'Could not update holiday. Please try again.',
                variant: 'destructive',
            });
        },
    });
}

/**
 * Delete a holiday
 * Manager-only operation
 */
export function useDeleteHoliday() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { holidayId: string; workspaceId: string; name: string }) => {
            await databases.deleteDocument(
                DATABASE_ID,
                HOLIDAYS_COLLECTION_ID,
                data.holidayId
            );

            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['holidays', data.workspaceId] });
            toast({
                title: 'Holiday Deleted',
                description: `${data.name} has been removed from the calendar.`,
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Failed to Delete Holiday',
                description: error.message || 'Could not delete holiday. Please try again.',
                variant: 'destructive',
            });
        },
    });
}
