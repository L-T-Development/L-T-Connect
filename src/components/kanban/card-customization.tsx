'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CardCustomizationSettings {
  showAssignee: boolean;
  showLabels: boolean;
  showPriority: boolean;
  showDueDate: boolean;
  showDependencies: boolean;
  showDescription: boolean;
  showCreatedDate: boolean;
  compactMode: boolean;
}

interface CardCustomizationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: CardCustomizationSettings;
  onSave: (settings: CardCustomizationSettings) => Promise<void>;
}

const DEFAULT_SETTINGS: CardCustomizationSettings = {
  showAssignee: true,
  showLabels: true,
  showPriority: true,
  showDueDate: true,
  showDependencies: true,
  showDescription: false,
  showCreatedDate: false,
  compactMode: false,
};

export function CardCustomization({ open, onOpenChange, settings, onSave }: CardCustomizationProps) {
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<CardCustomizationSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const toggleSetting = (key: keyof CardCustomizationSettings) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const resetToDefaults = () => {
    setLocalSettings(DEFAULT_SETTINGS);
    toast({
      title: 'Reset to defaults',
      description: 'Card display settings have been reset',
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localSettings);
      toast({
        title: 'Settings saved',
        description: 'Card display preferences have been updated',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const settingOptions = [
    {
      key: 'showPriority' as const,
      label: 'Priority Indicator',
      description: 'Show colored dot indicating task priority',
      icon: '🔴',
    },
    {
      key: 'showAssignee' as const,
      label: 'Assignee Avatars',
      description: 'Show who is assigned to the task',
      icon: '👤',
    },
    {
      key: 'showLabels' as const,
      label: 'Labels',
      description: 'Display task labels and tags',
      icon: '🏷️',
    },
    {
      key: 'showDueDate' as const,
      label: 'Due Date',
      description: 'Show when the task is due',
      icon: '📅',
    },
    {
      key: 'showDependencies' as const,
      label: 'Dependencies',
      description: 'Display blocked by / blocks indicators',
      icon: '🔗',
    },
    {
      key: 'showDescription' as const,
      label: 'Description Preview',
      description: 'Show first line of task description',
      icon: '📝',
    },
    {
      key: 'showCreatedDate' as const,
      label: 'Created Date',
      description: 'Display when task was created',
      icon: '🕒',
    },
  ];

  const visibleCount = Object.values(localSettings).filter(v => v === true).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-blue-600" />
            Customize Card Display
          </DialogTitle>
          <DialogDescription>
            Choose which information to show on task cards. Settings apply to your view only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Display Mode */}
          <Card className="p-4 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">⚡</div>
                <div>
                  <Label htmlFor="compact-mode" className="text-sm font-medium">
                    Compact Mode
                  </Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Smaller cards with condensed information
                  </p>
                </div>
              </div>
              <Switch
                id="compact-mode"
                checked={localSettings.compactMode}
                onCheckedChange={() => toggleSetting('compactMode')}
              />
            </div>
          </Card>

          {/* Field Toggles */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Card Elements ({visibleCount} visible)
              </h4>
              <Button variant="ghost" size="sm" onClick={resetToDefaults}>
                Reset to Defaults
              </Button>
            </div>

            <div className="space-y-2">
              {settingOptions.map(option => (
                <Card key={option.key} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-xl">{option.icon}</div>
                      <div className="flex-1">
                        <Label htmlFor={option.key} className="text-sm font-medium flex items-center gap-2">
                          {option.label}
                          {localSettings[option.key] ? (
                            <Eye className="h-3 w-3 text-green-600" />
                          ) : (
                            <EyeOff className="h-3 w-3 text-gray-400" />
                          )}
                        </Label>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          {option.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id={option.key}
                      checked={localSettings[option.key]}
                      onCheckedChange={() => toggleSetting(option.key)}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Preview */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-4">
              Preview
            </h4>
            <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 ${
              localSettings.compactMode ? 'text-sm' : ''
            }`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-mono text-gray-500">PROJ-123</span>
                {localSettings.showPriority && (
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                )}
              </div>
              
              <h5 className={`font-medium text-gray-900 dark:text-gray-100 mb-2 ${
                localSettings.compactMode ? 'text-sm' : ''
              }`}>
                Sample Task Title
              </h5>

              {localSettings.showDescription && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  This is a preview of the task description...
                </p>
              )}

              <div className="space-y-2">
                {localSettings.showDueDate && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    📅 Due in 3 days
                  </div>
                )}

                {localSettings.showDependencies && (
                  <div className="flex gap-1">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">
                      A
                    </div>
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs text-white">
                      B
                    </div>
                  </div>
                )}

                {localSettings.showLabels && (
                  <div className="flex gap-1 flex-wrap">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      Backend
                    </span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      API
                    </span>
                  </div>
                )}

                {localSettings.showCreatedDate && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Created 2 days ago
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Save */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
