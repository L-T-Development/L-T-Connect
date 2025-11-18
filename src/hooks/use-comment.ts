import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '@/lib/appwrite-client';
import { Query, ID } from 'appwrite';
import type { TaskComment } from '@/types';
import { toast } from '@/hooks/use-toast';
import { createBulkNotifications } from '@/hooks/use-notification';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const TASK_COMMENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_TASK_COMMENTS_COLLECTION_ID!;

export function useTaskComments(taskId?: string) {
  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        TASK_COMMENTS_COLLECTION_ID,
        [
          Query.equal('taskId', taskId),
          Query.orderDesc('$createdAt')
        ]
      );
      
      // Parse JSON fields
      const comments = response.documents.map(doc => ({
        ...doc,
        mentions: typeof doc.mentions === 'string' && doc.mentions ? JSON.parse(doc.mentions) : [],
        attachments: typeof doc.attachments === 'string' && doc.attachments ? JSON.parse(doc.attachments) : [],
      })) as unknown as TaskComment[];
      
      return comments;
    },
    enabled: !!taskId,
  });
}

export function useCreateTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      taskId: string;
      userId: string;
      userName?: string;
      taskTitle?: string;
      workspaceId?: string;
      content: string;
      mentions?: string[];
      attachments?: any[];
    }) => {
      const response = await databases.createDocument(
        DATABASE_ID,
        TASK_COMMENTS_COLLECTION_ID,
        ID.unique(),
        {
          taskId: data.taskId,
          userId: data.userId,
          content: data.content,
          mentions: JSON.stringify(data.mentions || []),
          attachments: JSON.stringify(data.attachments || []),
        }
      );
      
      // Parse JSON fields
      const comment = {
        ...response,
        mentions: typeof response.mentions === 'string' && response.mentions ? JSON.parse(response.mentions) : [],
        attachments: typeof response.attachments === 'string' && response.attachments ? JSON.parse(response.attachments) : [],
      } as unknown as TaskComment;
      
      return comment;
    },
    onSuccess: async (comment, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', comment.taskId] });
      
      // Send COMMENT_MENTION notifications to mentioned users
      if (variables.mentions && variables.mentions.length > 0 && variables.workspaceId) {
        await createBulkNotifications({
          workspaceId: variables.workspaceId,
          userIds: variables.mentions,
          type: 'COMMENT_MENTION',
          data: {
            taskId: comment.taskId,
            taskTitle: variables.taskTitle || 'a task',
            userName: variables.userName || 'Someone',
            commentId: comment.$id,
            commentContent: comment.content.substring(0, 100), // First 100 chars
          },
        });
      }
      
      toast({
        title: 'Comment added',
        description: 'Your comment has been posted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add comment',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      content,
      mentions,
    }: {
      commentId: string;
      taskId: string;
      content: string;
      mentions?: string[];
    }) => {
      const response = await databases.updateDocument(
        DATABASE_ID,
        TASK_COMMENTS_COLLECTION_ID,
        commentId,
        {
          content,
          mentions: JSON.stringify(mentions || []),
        }
      );
      
      const comment = {
        ...response,
        mentions: typeof response.mentions === 'string' && response.mentions ? JSON.parse(response.mentions) : [],
        attachments: typeof response.attachments === 'string' && response.attachments ? JSON.parse(response.attachments) : [],
      } as unknown as TaskComment;
      
      return comment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', variables.taskId] });
      toast({
        title: 'Comment updated',
        description: 'Your comment has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update comment',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      taskId,
    }: {
      commentId: string;
      taskId: string;
    }) => {
      await databases.deleteDocument(
        DATABASE_ID,
        TASK_COMMENTS_COLLECTION_ID,
        commentId
      );
      return { commentId, taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', data.taskId] });
      toast({
        title: 'Comment deleted',
        description: 'Your comment has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete comment',
        variant: 'destructive',
      });
    },
  });
}
