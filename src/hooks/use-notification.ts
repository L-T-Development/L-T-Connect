import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query, ID } from 'appwrite';
import type { Notification, NotificationType } from '@/types';
import { toast } from '@/hooks/use-toast';
import { generateNotification, shouldSendEmail } from '@/lib/notification-utils';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const NOTIFICATIONS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID!;

export function useNotifications(userId?: string) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(50)
        ]
      );
      
      return response.documents as unknown as Notification[];
    },
    enabled: !!userId,
  });
}

export function useUnreadNotifications(userId?: string) {
  return useQuery({
    queryKey: ['notifications', 'unread', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.equal('isRead', false),
          Query.orderDesc('$createdAt')
        ]
      );
      
      return response.documents as unknown as Notification[];
    },
    enabled: !!userId,
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      userId: string;
      type: NotificationType;
      title: string;
      message: string;
      relatedEntityId?: string;
      relatedEntityType?: 'TASK' | 'SPRINT' | 'LEAVE' | 'ATTENDANCE';
      actionUrl?: string;
    }) => {
      const response = await databases.createDocument(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        ID.unique(),
        {
          workspaceId: data.workspaceId,
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          relatedEntityId: data.relatedEntityId || '',
          relatedEntityType: data.relatedEntityType || '',
          actionUrl: data.actionUrl || '',
          isRead: false,
        }
      );
      
      return response as unknown as Notification;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', data.userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread', data.userId] });
    },
    onError: (error: any) => {
      console.error('Failed to create notification:', error);
    },
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      notificationId,
      userId,
    }: {
      notificationId: string;
      userId: string;
    }) => {
      const response = await databases.updateDocument(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        notificationId,
        { isRead: true }
      );
      
      return { notification: response as unknown as Notification, userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', data.userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread', data.userId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark notification as read',
        variant: 'destructive',
      });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      notificationIds,
    }: {
      userId: string;
      notificationIds: string[];
    }) => {
      // Update all notifications in parallel
      await Promise.all(
        notificationIds.map(id =>
          databases.updateDocument(
            DATABASE_ID,
            NOTIFICATIONS_COLLECTION_ID,
            id,
            { isRead: true }
          )
        )
      );
      
      return { userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', data.userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread', data.userId] });
      toast({
        title: 'All notifications marked as read',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark notifications as read',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      notificationId,
      userId,
    }: {
      notificationId: string;
      userId: string;
    }) => {
      await databases.deleteDocument(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        notificationId
      );
      return { userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', data.userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread', data.userId] });
      toast({
        title: 'Notification deleted',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete notification',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// Helper Functions for Creating Notifications
// ============================================================================

/**
 * Create a notification using templates
 * This simplifies notification creation throughout the app
 */
export async function createNotificationFromTemplate({
  workspaceId,
  userId,
  type,
  data,
}: {
  workspaceId: string;
  userId: string;
  type: string;
  data: any;
}): Promise<Notification | null> {
  const notifContent = generateNotification(type, data);
  
  if (!notifContent) {
    console.error(`Failed to generate notification for type: ${type}`);
    return null;
  }
  
  try {
    const notification = await databases.createDocument(
      DATABASE_ID,
      NOTIFICATIONS_COLLECTION_ID,
      ID.unique(),
      {
        workspaceId,
        userId,
        type,
        title: notifContent.title,
        message: notifContent.message,
        relatedEntityId: data.taskId || data.sprintId || data.leaveId || '',
        relatedEntityType: data.entityType || '',
        actionUrl: notifContent.actionUrl || '',
        isRead: false,
      }
    );
    
    // TODO: Send email if required (integrate with existing email service)
    if (shouldSendEmail(type)) {
      console.log(`Email should be sent for notification type: ${type}`);
      // await sendNotificationEmail({ userId, notification });
    }
    
    return notification as unknown as Notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

/**
 * Create multiple notifications for multiple users
 */
export async function createBulkNotifications({
  workspaceId,
  userIds,
  type,
  data,
}: {
  workspaceId: string;
  userIds: string | string[];
  type: string;
  data: any;
}): Promise<Notification[]> {
  // Ensure userIds is always an array
  const userIdsArray = Array.isArray(userIds) ? userIds : 
                       typeof userIds === 'string' ? [userIds] :
                       [];
  
  // Filter out empty strings and duplicates
  const validUserIds = [...new Set(userIdsArray.filter(id => id && typeof id === 'string' && id.trim() !== ''))];
  
  if (validUserIds.length === 0) {
    console.warn('createBulkNotifications called with no valid user IDs');
    return [];
  }
  
  const notifications = await Promise.all(
    validUserIds.map((userId) =>
      createNotificationFromTemplate({
        workspaceId,
        userId,
        type,
        data,
      })
    )
  );
  
  return notifications.filter((n): n is Notification => n !== null);
}
