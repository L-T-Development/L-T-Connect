'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { databases } from '@/lib/appwrite-client';

interface StandupNote {
  $id: string;
  userId: string;
  userName: string;
  userEmail: string;
  yesterday: string;
  today: string;
  blockers: string;
  date: string;
  $createdAt: string;
}

interface StandupNotesProps {
  sprintId: string;
  projectId: string;
  currentUser: {
    $id: string;
    name: string;
    email: string;
  };
}

export function StandupNotes({ sprintId, projectId, currentUser }: StandupNotesProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<StandupNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [yesterday, setYesterday] = useState('');
  const [today, setToday] = useState('');
  const [blockers, setBlockers] = useState('');
  
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [sprintId]);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_STANDUP_NOTES_COLLECTION_ID!,
        [`sprintId=${sprintId}`]
      );

      const sortedNotes = response.documents
        .sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime());
      
      setNotes(sortedNotes as any);

      // Check if user has submitted today
      const todayNote = sortedNotes.find(
        (note: any) => note.userId === currentUser.$id && isToday(new Date(note.date))
      );
      setHasSubmittedToday(!!todayNote);

      // Load today's note if exists
      if (todayNote) {
        setYesterday(todayNote.yesterday || '');
        setToday(todayNote.today || '');
        setBlockers(todayNote.blockers || '');
      }
    } catch (error) {
      console.error('Failed to load standup notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!yesterday.trim() || !today.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please fill in yesterday and today fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const todayDate = format(new Date(), 'yyyy-MM-dd');

      // Check if note exists for today
      const existingNote = notes.find(
        note => note.userId === currentUser.$id && note.date === todayDate
      );

      if (existingNote) {
        // Update existing note
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_STANDUP_NOTES_COLLECTION_ID!,
          existingNote.$id,
          {
            yesterday: yesterday.trim(),
            today: today.trim(),
            blockers: blockers.trim(),
          }
        );
      } else {
        // Create new note
        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_STANDUP_NOTES_COLLECTION_ID!,
          'unique()',
          {
            sprintId,
            projectId,
            userId: currentUser.$id,
            userName: currentUser.name,
            userEmail: currentUser.email,
            yesterday: yesterday.trim(),
            today: today.trim(),
            blockers: blockers.trim(),
            date: todayDate,
          }
        );
      }

      toast({
        title: 'Standup note saved',
        description: 'Your daily update has been recorded',
      });

      setHasSubmittedToday(true);
      loadNotes();
    } catch (error) {
      console.error('Failed to save standup note:', error);
      toast({
        title: 'Error',
        description: 'Failed to save standup note',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getDateLabel = (date: string) => {
    const noteDate = new Date(date);
    if (isToday(noteDate)) return 'Today';
    if (isYesterday(noteDate)) return 'Yesterday';
    return format(noteDate, 'MMM d, yyyy');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Daily Standup Notes</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Share what you did yesterday, what you're doing today, and any blockers
        </p>
      </div>

      {/* Input Form */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            Your Standup for {format(new Date(), 'MMMM d, yyyy')}
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              ✅ What did you do yesterday?
            </label>
            <Textarea
              value={yesterday}
              onChange={(e) => setYesterday(e.target.value)}
              placeholder="Completed task XYZ, reviewed pull request..."
              className="min-h-[80px] bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              🎯 What will you do today?
            </label>
            <Textarea
              value={today}
              onChange={(e) => setToday(e.target.value)}
              placeholder="Work on feature ABC, attend planning meeting..."
              className="min-h-[80px] bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              🚧 Any blockers or impediments?
            </label>
            <Textarea
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder="Waiting for API access, need clarification on requirements... (Leave blank if none)"
              className="min-h-[80px] bg-white dark:bg-gray-800"
            />
          </div>

          <Button onClick={handleSubmit} disabled={isSaving} className="w-full">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : hasSubmittedToday ? (
              'Update Today\'s Standup'
            ) : (
              'Submit Standup Note'
            )}
          </Button>
        </div>
      </Card>

      {/* Notes Feed */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Team Standup History
        </h3>

        {notes.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No standup notes yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Be the first to share your daily update!
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <Card key={note.$id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                      {note.userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {note.userName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {getDateLabel(note.date)} • {format(new Date(note.$createdAt), 'h:mm a')}
                        </p>
                      </div>
                      {note.userId === currentUser.$id && isToday(new Date(note.date)) && (
                        <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded-full">
                          You
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-green-600 dark:text-green-400">Yesterday:</span>
                        <p className="text-gray-700 dark:text-gray-300 mt-1">{note.yesterday}</p>
                      </div>
                      <div>
                        <span className="font-medium text-blue-600 dark:text-blue-400">Today:</span>
                        <p className="text-gray-700 dark:text-gray-300 mt-1">{note.today}</p>
                      </div>
                      {note.blockers && (
                        <div>
                          <span className="font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Blockers:
                          </span>
                          <p className="text-gray-700 dark:text-gray-300 mt-1">{note.blockers}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
