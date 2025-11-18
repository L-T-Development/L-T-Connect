'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  GitBranch,
  MessageSquare,
  UserPlus,
  FileText,
  Calendar,
  Tag,
  Edit,
  Trash2,
  Clock,
  Filter,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type ActivityType =
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_assigned'
  | 'task_status_changed'
  | 'comment_added'
  | 'requirement_created'
  | 'requirement_updated'
  | 'sprint_created'
  | 'sprint_started'
  | 'sprint_completed'
  | 'epic_created'
  | 'member_added';

interface Activity {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string;
  entityId: string;
  entityType: 'task' | 'requirement' | 'sprint' | 'epic' | 'comment' | 'project';
  entityTitle: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface ActivityFeedProps {
  projectId: string;
  workspaceId?: string;
  limit?: number;
  showFilters?: boolean;
  className?: string;
}

// Activity configuration with icons and colors
const activityConfig: Record<ActivityType, { icon: any; color: string; label: string }> = {
  task_created: { icon: FileText, color: 'text-blue-500', label: 'Task Created' },
  task_updated: { icon: Edit, color: 'text-yellow-500', label: 'Task Updated' },
  task_deleted: { icon: Trash2, color: 'text-red-500', label: 'Task Deleted' },
  task_assigned: { icon: UserPlus, color: 'text-purple-500', label: 'Task Assigned' },
  task_status_changed: { icon: CheckCircle2, color: 'text-green-500', label: 'Status Changed' },
  comment_added: { icon: MessageSquare, color: 'text-indigo-500', label: 'Comment Added' },
  requirement_created: { icon: FileText, color: 'text-blue-500', label: 'Requirement Created' },
  requirement_updated: { icon: Edit, color: 'text-yellow-500', label: 'Requirement Updated' },
  sprint_created: { icon: GitBranch, color: 'text-cyan-500', label: 'Sprint Created' },
  sprint_started: { icon: Calendar, color: 'text-green-500', label: 'Sprint Started' },
  sprint_completed: { icon: CheckCircle2, color: 'text-green-600', label: 'Sprint Completed' },
  epic_created: { icon: Tag, color: 'text-orange-500', label: 'Epic Created' },
  member_added: { icon: UserPlus, color: 'text-purple-500', label: 'Member Added' },
};

export function ActivityFeed({
  projectId,
  limit = 50,
  showFilters = true,
  className,
}: ActivityFeedProps) {
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [filterType, setFilterType] = React.useState<ActivityType | 'all'>('all');
  const refreshInterval = 30000; // 30 seconds

  // Mock data for demonstration - Replace with actual API call
  React.useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      
      // TODO: Replace with actual Appwrite query
      // const response = await databases.listDocuments(
      //   DATABASE_ID,
      //   ACTIVITIES_COLLECTION_ID,
      //   [
      //     Query.equal('projectId', projectId),
      //     Query.orderDesc('$createdAt'),
      //     Query.limit(limit),
      //   ]
      // );

      // Mock data
      const mockActivities: Activity[] = [
        {
          id: '1',
          type: 'task_created',
          userId: 'user1',
          userName: 'John Doe',
          entityId: 'task1',
          entityType: 'task',
          entityTitle: 'Implement authentication system',
          description: 'created a new task',
          createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
        },
        {
          id: '2',
          type: 'comment_added',
          userId: 'user2',
          userName: 'Jane Smith',
          entityId: 'task2',
          entityType: 'comment',
          entityTitle: 'Design database schema',
          description: 'commented on',
          metadata: { commentPreview: 'We should consider using PostgreSQL...' },
          createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
        },
        {
          id: '3',
          type: 'task_status_changed',
          userId: 'user3',
          userName: 'Mike Johnson',
          entityId: 'task3',
          entityType: 'task',
          entityTitle: 'Create API endpoints',
          description: 'changed status from TODO to IN_PROGRESS',
          metadata: { oldStatus: 'TODO', newStatus: 'IN_PROGRESS' },
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        },
        {
          id: '4',
          type: 'task_assigned',
          userId: 'user1',
          userName: 'John Doe',
          entityId: 'task4',
          entityType: 'task',
          entityTitle: 'Write unit tests',
          description: 'assigned',
          metadata: { assignedTo: 'Sarah Williams' },
          createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        },
        {
          id: '5',
          type: 'sprint_started',
          userId: 'user2',
          userName: 'Jane Smith',
          entityId: 'sprint1',
          entityType: 'sprint',
          entityTitle: 'Sprint 3 - Q1 2024',
          description: 'started sprint',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        },
        {
          id: '6',
          type: 'requirement_created',
          userId: 'user3',
          userName: 'Mike Johnson',
          entityId: 'req1',
          entityType: 'requirement',
          entityTitle: 'User authentication flow',
          description: 'created a new requirement',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
        },
      ];

      setActivities(mockActivities);
      setIsLoading(false);
    };

    fetchActivities();

    // Auto-refresh activities
    const interval = setInterval(fetchActivities, refreshInterval);
    return () => clearInterval(interval);
  }, [projectId, limit, refreshInterval]);

  // Filter activities by type
  const filteredActivities = React.useMemo(() => {
    if (filterType === 'all') return activities;
    return activities.filter((activity) => activity.type === filterType);
  }, [activities, filterType]);

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>Loading recent activities...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activity Feed
            </CardTitle>
            <CardDescription>
              Recent activity in your project • Auto-refreshes every {refreshInterval / 1000}s
            </CardDescription>
          </div>
          {showFilters && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={(value) => setFilterType(value as ActivityType | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="task_created">Task Created</SelectItem>
                  <SelectItem value="task_updated">Task Updated</SelectItem>
                  <SelectItem value="task_status_changed">Status Changed</SelectItem>
                  <SelectItem value="comment_added">Comments</SelectItem>
                  <SelectItem value="sprint_created">Sprints</SelectItem>
                  <SelectItem value="requirement_created">Requirements</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No activities yet</h3>
              <p className="text-sm text-muted-foreground">
                Activity will appear here as your team works on the project
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity) => {
                const config = activityConfig[activity.type];
                const Icon = config.icon;

                return (
                  <div
                    key={activity.id}
                    className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    {/* Activity Icon */}
                    <div className="shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                    </div>

                    {/* Activity Content */}
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(activity.userName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{activity.userName}</span>
                          <span className="text-sm text-muted-foreground">{activity.description}</span>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {config.label}
                        </Badge>
                      </div>

                      {/* Entity Title */}
                      <div className="text-sm font-medium truncate">
                        {activity.entityTitle}
                      </div>

                      {/* Metadata */}
                      {activity.metadata && (
                        <div className="text-xs text-muted-foreground">
                          {activity.metadata.commentPreview && (
                            <span className="italic">"{activity.metadata.commentPreview}"</span>
                          )}
                          {activity.metadata.assignedTo && (
                            <span>to {activity.metadata.assignedTo}</span>
                          )}
                          {activity.metadata.oldStatus && activity.metadata.newStatus && (
                            <span>
                              from <Badge variant="outline" className="text-xs mx-1">{activity.metadata.oldStatus}</Badge>
                              to <Badge variant="outline" className="text-xs mx-1">{activity.metadata.newStatus}</Badge>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
