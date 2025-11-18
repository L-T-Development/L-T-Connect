'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { MessageSquarePlus, Lightbulb, AlertTriangle, CheckCircle2, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { databases } from '@/lib/appwrite-client';

interface RetrospectiveItem {
  id: string;
  text: string;
}

interface RetrospectiveData {
  wentWell: RetrospectiveItem[];
  didntGoWell: RetrospectiveItem[];
  actionItems: RetrospectiveItem[];
}

interface RetrospectiveFormProps {
  sprintId: string;
  projectId: string;
  sprintName: string;
  onSave?: () => void;
}

export function RetrospectiveForm({ sprintId, projectId, sprintName, onSave }: RetrospectiveFormProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [wentWellInput, setWentWellInput] = useState('');
  const [didntGoWellInput, setDidntGoWellInput] = useState('');
  const [actionItemInput, setActionItemInput] = useState('');
  
  const [retrospective, setRetrospective] = useState<RetrospectiveData>({
    wentWell: [],
    didntGoWell: [],
    actionItems: [],
  });

  // Load existing retrospective data
  useEffect(() => {
    loadRetrospective();
  }, [sprintId]);

  const loadRetrospective = async () => {
    try {
      setIsLoading(true);
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_RETROSPECTIVES_COLLECTION_ID!,
        [`sprintId=${sprintId}`]
      );

      if (response.documents.length > 0) {
        const data = response.documents[0];
        setRetrospective({
          wentWell: data.wentWell || [],
          didntGoWell: data.didntGoWell || [],
          actionItems: data.actionItems || [],
        });
      }
    } catch (error) {
      console.error('Failed to load retrospective:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveRetrospective = async (updatedData: RetrospectiveData) => {
    try {
      setIsSaving(true);
      
      // Check if retrospective already exists
      const existing = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_RETROSPECTIVES_COLLECTION_ID!,
        [`sprintId=${sprintId}`]
      );

      if (existing.documents.length > 0) {
        // Update existing
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_RETROSPECTIVES_COLLECTION_ID!,
          existing.documents[0].$id,
          {
            wentWell: updatedData.wentWell,
            didntGoWell: updatedData.didntGoWell,
            actionItems: updatedData.actionItems,
          }
        );
      } else {
        // Create new
        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_RETROSPECTIVES_COLLECTION_ID!,
          'unique()',
          {
            sprintId,
            projectId,
            sprintName,
            wentWell: updatedData.wentWell,
            didntGoWell: updatedData.didntGoWell,
            actionItems: updatedData.actionItems,
          }
        );
      }

      toast({
        title: 'Saved',
        description: 'Retrospective saved successfully',
      });
      
      onSave?.();
    } catch (error) {
      console.error('Failed to save retrospective:', error);
      toast({
        title: 'Error',
        description: 'Failed to save retrospective',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = (section: 'wentWell' | 'didntGoWell' | 'actionItems', text: string) => {
    if (!text.trim()) return;

    const newItem: RetrospectiveItem = {
      id: Date.now().toString(),
      text: text.trim(),
    };

    const updatedData = {
      ...retrospective,
      [section]: [...retrospective[section], newItem],
    };

    setRetrospective(updatedData);
    saveRetrospective(updatedData);

    // Clear input
    if (section === 'wentWell') setWentWellInput('');
    if (section === 'didntGoWell') setDidntGoWellInput('');
    if (section === 'actionItems') setActionItemInput('');
  };

  const removeItem = (section: 'wentWell' | 'didntGoWell' | 'actionItems', itemId: string) => {
    const updatedData = {
      ...retrospective,
      [section]: retrospective[section].filter(item => item.id !== itemId),
    };

    setRetrospective(updatedData);
    saveRetrospective(updatedData);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sprint Retrospective</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Reflect on {sprintName} and identify improvements
          </p>
        </div>
        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </div>
        )}
      </div>

      {/* What Went Well */}
      <Card className="p-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">What Went Well</h3>
        </div>
        
        <div className="space-y-3 mb-4">
          {retrospective.wentWell.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-start justify-between gap-3">
              <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{item.text}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeItem('wentWell', item.id)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
              >
                ×
              </Button>
            </div>
          ))}
          {retrospective.wentWell.length === 0 && (
            <p className="text-sm text-green-600 dark:text-green-400 italic">No items yet. Add what went well!</p>
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            value={wentWellInput}
            onChange={(e) => setWentWellInput(e.target.value)}
            placeholder="What went well in this sprint? (e.g., Great team collaboration, Met all sprint goals)"
            className="flex-1 min-h-[60px] bg-white dark:bg-gray-800"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addItem('wentWell', wentWellInput);
              }
            }}
          />
          <Button
            onClick={() => addItem('wentWell', wentWellInput)}
            disabled={!wentWellInput.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* What Didn't Go Well */}
      <Card className="p-6 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">What Didn't Go Well</h3>
        </div>
        
        <div className="space-y-3 mb-4">
          {retrospective.didntGoWell.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-start justify-between gap-3">
              <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{item.text}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeItem('didntGoWell', item.id)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
              >
                ×
              </Button>
            </div>
          ))}
          {retrospective.didntGoWell.length === 0 && (
            <p className="text-sm text-red-600 dark:text-red-400 italic">No items yet. Identify areas for improvement.</p>
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            value={didntGoWellInput}
            onChange={(e) => setDidntGoWellInput(e.target.value)}
            placeholder="What didn't go well? (e.g., Unclear requirements, Technical debt slowed us down)"
            className="flex-1 min-h-[60px] bg-white dark:bg-gray-800"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addItem('didntGoWell', didntGoWellInput);
              }
            }}
          />
          <Button
            onClick={() => addItem('didntGoWell', didntGoWellInput)}
            disabled={!didntGoWellInput.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Action Items */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Action Items for Next Sprint</h3>
        </div>
        
        <div className="space-y-3 mb-4">
          {retrospective.actionItems.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-start justify-between gap-3">
              <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{item.text}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeItem('actionItems', item.id)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
              >
                ×
              </Button>
            </div>
          ))}
          {retrospective.actionItems.length === 0 && (
            <p className="text-sm text-blue-600 dark:text-blue-400 italic">No action items yet. What will you improve?</p>
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            value={actionItemInput}
            onChange={(e) => setActionItemInput(e.target.value)}
            placeholder="Action items for next sprint (e.g., Schedule backlog refinement sessions, Implement automated testing)"
            className="flex-1 min-h-[60px] bg-white dark:bg-gray-800"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addItem('actionItems', actionItemInput);
              }
            }}
          />
          <Button
            onClick={() => addItem('actionItems', actionItemInput)}
            disabled={!actionItemInput.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-4 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-6">
            <span className="text-green-600 dark:text-green-400">
              ✓ {retrospective.wentWell.length} Positives
            </span>
            <span className="text-red-600 dark:text-red-400">
              ⚠ {retrospective.didntGoWell.length} Issues
            </span>
            <span className="text-blue-600 dark:text-blue-400">
              💡 {retrospective.actionItems.length} Actions
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Save className="h-4 w-4" />
            <span>Auto-saved</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
