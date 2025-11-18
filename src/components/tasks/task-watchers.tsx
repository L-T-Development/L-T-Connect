'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Eye, EyeOff, Plus, X } from 'lucide-react';
import { useTeamMembers } from '@/hooks/use-team';
import { useAuth } from '@/components/providers/auth-provider';

interface TaskWatchersProps {
  watcherIds: string[];
  projectId: string;
  onChange: (watcherIds: string[]) => void;
  readonly?: boolean;
}

export function TaskWatchers({ watcherIds, projectId, onChange, readonly = false }: TaskWatchersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { data: teamMembers = [], isLoading } = useTeamMembers(projectId);

  const watchers = teamMembers.filter(member => watcherIds.includes(member.$id));
  const availableMembers = teamMembers.filter(member => !watcherIds.includes(member.$id));

  const handleAddWatcher = (userId: string) => {
    if (!watcherIds.includes(userId)) {
      onChange([...watcherIds, userId]);
    }
    setIsOpen(false);
  };

  const handleRemoveWatcher = (userId: string) => {
    onChange(watcherIds.filter(id => id !== userId));
  };

  const handleToggleSelfWatch = () => {
    if (!user) return;
    
    if (watcherIds.includes(user.$id)) {
      handleRemoveWatcher(user.$id);
    } else {
      handleAddWatcher(user.$id);
    }
  };

  const isWatching = user && watcherIds.includes(user.$id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Watchers</label>
        {!readonly && user && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleSelfWatch}
            className="h-7 gap-1"
          >
            {isWatching ? (
              <>
                <EyeOff className="h-3 w-3" />
                Unwatch
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" />
                Watch
              </>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {/* Watcher List */}
        {watchers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {watchers.map((watcher) => {
              const initials = watcher.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <Badge key={watcher.$id} variant="secondary" className="gap-2 pr-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{watcher.name}</span>
                  {!readonly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 hover:bg-transparent"
                      onClick={() => handleRemoveWatcher(watcher.$id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </Badge>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No watchers. Watchers will receive notifications about task updates.
          </p>
        )}

        {/* Add Watcher */}
        {!readonly && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add Watcher
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search team members..." />
                <CommandEmpty>
                  {isLoading ? 'Loading...' : 'No team members found.'}
                </CommandEmpty>
                <CommandGroup className="max-h-[200px] overflow-auto">
                  {availableMembers.map((member) => {
                    const initials = member.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <CommandItem
                        key={member.$id}
                        value={member.name}
                        onSelect={() => handleAddWatcher(member.$id)}
                        className="cursor-pointer"
                      >
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        <Eye className="h-3 w-3 inline mr-1" />
        Watchers get notified when this task is updated
      </p>
    </div>
  );
}
