'use client';

import * as React from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useTaskComments, useCreateTaskComment, useUpdateTaskComment, useDeleteTaskComment } from '@/hooks/use-comment';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToCollection, getRealtimeEventType, REALTIME_CONFIG } from '@/lib/appwrite-realtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageSquare, Send, MoreHorizontal, Edit2, Trash2, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { TaskComment } from '@/types';

interface CommentSectionProps {
  entityId: string;
}

export function CommentSection({ entityId }: CommentSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: comments, isLoading } = useTaskComments(entityId);
  const createComment = useCreateTaskComment();
  const updateComment = useUpdateTaskComment();
  const deleteComment = useDeleteTaskComment();

  const [newComment, setNewComment] = React.useState('');
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState('');

  // Real-time subscription for comments
  React.useEffect(() => {
    if (!entityId) return;

    const subscription = subscribeToCollection(
      REALTIME_CONFIG.DATABASE_ID,
      REALTIME_CONFIG.COLLECTIONS.COMMENTS,
      (response) => {
        const eventType = getRealtimeEventType(response.events);
        const payload = response.payload as any;

        // Only invalidate if the comment belongs to this entity
        if (payload.taskId === entityId) {
          queryClient.invalidateQueries({ queryKey: ['task-comments', entityId] });
          
          // Show toast for new comments (except your own)
          if (eventType === 'create' && payload.userId !== user?.$id) {
            // Optional: Show a subtle notification
            console.log('New comment added by another user');
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [entityId, queryClient, user?.$id]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    // Extract mentions from content (simple @username detection)
    const mentions = extractMentions(newComment);

    await createComment.mutateAsync({
      taskId: entityId,
      userId: user.$id,
      content: newComment,
      mentions,
    });

    setNewComment('');
  };

  const handleStartEdit = (comment: TaskComment) => {
    setEditingCommentId(comment.$id);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    const mentions = extractMentions(editContent);

    await updateComment.mutateAsync({
      commentId,
      taskId: entityId,
      content: editContent,
      mentions,
    });

    setEditingCommentId(null);
    setEditContent('');
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    await deleteComment.mutateAsync({
      commentId,
      taskId: entityId,
    });
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[2]); // User ID
    }

    return mentions;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading comments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments
          {comments && comments.length > 0 && (
            <Badge variant="secondary">{comments.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comment List */}
        <div className="space-y-4">
          {comments && comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.$id} className="flex gap-3">
                {/* Avatar */}
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>

                {/* Comment Content */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">User</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.$createdAt), { addSuffix: true })}
                      </span>
                      {comment.$updatedAt !== comment.$createdAt && (
                        <Badge variant="outline" className="text-xs">
                          edited
                        </Badge>
                      )}
                    </div>

                    {/* Actions (only for comment author) */}
                    {user && comment.userId === user.$id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStartEdit(comment)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(comment.$id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Comment Text or Edit Form */}
                  {editingCommentId === comment.$id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[80px]"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(comment.$id)}
                          disabled={!editContent.trim() || updateComment.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No comments yet. Be the first to comment!
            </p>
          )}
        </div>

        {/* New Comment Form */}
        {user && (
          <div className="flex gap-3 pt-4 border-t">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Write a comment... (Use @ to mention someone)"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmitComment();
                  }
                }}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Tip: Press Cmd/Ctrl + Enter to submit
                </p>
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || createComment.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Comment
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
