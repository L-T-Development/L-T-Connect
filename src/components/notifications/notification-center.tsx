'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToCollection, getRealtimeEventType, REALTIME_CONFIG } from '@/lib/appwrite-realtime';
import {
  useUnreadNotifications,
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from '@/hooks/use-notification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  CheckCheck,
  Trash2,
  MessageSquare,
  Calendar,
  CheckCircle2,
  AlertCircle,
  GitBranch,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Notification, NotificationType } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'TASK_ASSIGNED':
    case 'TASK_UPDATED':
      return CheckCircle2;
    case 'TASK_COMMENT':
    case 'MENTION':
      return MessageSquare;
    case 'SPRINT_EVENT':
      return GitBranch;
    case 'LEAVE_REQUEST':
    case 'LEAVE_APPROVED':
    case 'LEAVE_REJECTED':
      return Calendar;
    case 'ATTENDANCE_ALERT':
      return AlertCircle;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: NotificationType) => {
  switch (type) {
    case 'TASK_ASSIGNED':
      return 'text-blue-500';
    case 'TASK_COMMENT':
    case 'MENTION':
      return 'text-purple-500';
    case 'SPRINT_EVENT':
      return 'text-green-500';
    case 'LEAVE_APPROVED':
      return 'text-green-500';
    case 'LEAVE_REJECTED':
    case 'ATTENDANCE_ALERT':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (notification: Notification) => void;
}

function NotificationItem({ notification, onMarkAsRead, onDelete, onClick }: NotificationItemProps) {
  const Icon = getNotificationIcon(notification.type);
  const iconColor = getNotificationColor(notification.type);

  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg transition-colors cursor-pointer hover:bg-accent',
        !notification.isRead && 'bg-blue-50/50 dark:bg-blue-950/20'
      )}
      onClick={() => onClick(notification)}
    >
      <div className={cn('mt-1', iconColor)}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-tight">{notification.title}</p>
          {!notification.isRead && (
            <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.$createdAt), { addSuffix: true })}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
            <span className="sr-only">Actions</span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
            >
              <path
                d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z"
                fill="currentColor"
              />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!notification.isRead && (
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.$id);
            }}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark as read
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.$id);
            }}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function NotificationCenter() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: unreadNotifications } = useUnreadNotifications(user?.$id);
  const { data: allNotifications } = useNotifications(user?.$id);
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();

  const [open, setOpen] = React.useState(false);

  // Real-time subscription for notifications
  React.useEffect(() => {
    if (!user?.$id) return;

    const subscription = subscribeToCollection(
      REALTIME_CONFIG.DATABASE_ID,
      REALTIME_CONFIG.COLLECTIONS.NOTIFICATIONS,
      (response) => {
        const eventType = getRealtimeEventType(response.events);
        const payload = response.payload as any;

        // Only process notifications for this user
        if (payload.userId === user.$id) {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.$id] });
          queryClient.invalidateQueries({ queryKey: ['unread-notifications', user.$id] });

          // Show toast for new notifications
          if (eventType === 'create') {
            toast({
              title: 'New Notification',
              description: payload.title || 'You have a new notification',
            });
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.$id, queryClient]);

  const unreadCount = unreadNotifications?.length || 0;

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return;
    await markAsRead.mutateAsync({ notificationId, userId: user.$id });
  };

  const handleMarkAllAsRead = async () => {
    if (!user || !unreadNotifications || unreadNotifications.length === 0) return;
    
    const unreadIds = unreadNotifications.map(n => n.$id);
    await markAllAsRead.mutateAsync({ userId: user.$id, notificationIds: unreadIds });
  };

  const handleDelete = async (notificationId: string) => {
    if (!user) return;
    await deleteNotification.mutateAsync({ notificationId, userId: user.$id });
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      handleMarkAsRead(notification.$id);
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      setOpen(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          <div className="p-2 space-y-1">
            {allNotifications && allNotifications.length > 0 ? (
              allNotifications.map((notification) => (
                <NotificationItem
                  key={notification.$id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  onClick={handleNotificationClick}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You&apos;re all caught up!
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
