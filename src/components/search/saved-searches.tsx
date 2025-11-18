'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Save,
  Star,
  MoreVertical,
  Trash2,
  Globe,
  User,
  TrendingUp,
} from 'lucide-react';
import {
  useSavedSearches,
  useCreateSavedSearch,
  useDeleteSavedSearch,
  useIncrementSearchUseCount,
  type SavedSearch,
} from '@/hooks/use-saved-searches';
import type { TaskFilters } from '@/components/search/advanced-filters';

interface SavedSearchesProps {
  workspaceId: string;
  userId: string;
  currentFilters: TaskFilters;
  onApplySearch: (filters: TaskFilters) => void;
}

export function SavedSearches({
  workspaceId,
  userId,
  currentFilters,
  onApplySearch,
}: SavedSearchesProps) {
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [searchName, setSearchName] = React.useState('');
  const [searchDescription, setSearchDescription] = React.useState('');
  const [isGlobal, setIsGlobal] = React.useState(false);

  const { data: savedSearches = [] } = useSavedSearches(workspaceId, userId);
  const createSearch = useCreateSavedSearch();
  const deleteSearch = useDeleteSavedSearch();
  const incrementUseCount = useIncrementSearchUseCount();

  const hasActiveFilters = React.useMemo(() => {
    return Object.keys(currentFilters).length > 0;
  }, [currentFilters]);

  const handleSaveSearch = async () => {
    if (!searchName.trim()) return;

    await createSearch.mutateAsync({
      workspaceId,
      userId,
      name: searchName,
      description: searchDescription,
      filters: currentFilters,
      isGlobal,
    });

    setSearchName('');
    setSearchDescription('');
    setIsGlobal(false);
    setSaveDialogOpen(false);
  };

  const handleApplySearch = async (search: SavedSearch) => {
    onApplySearch(search.filters);
    
    // Increment use count
    await incrementUseCount.mutateAsync({
      searchId: search.$id,
      workspaceId,
      userId,
      currentCount: search.useCount,
    });
  };

  const handleDeleteSearch = async (searchId: string) => {
    await deleteSearch.mutateAsync({
      searchId,
      workspaceId,
      userId,
    });
  };

  const getFilterSummary = (filters: TaskFilters): string => {
    const parts: string[] = [];
    
    if (filters.status && filters.status.length > 0) {
      parts.push(`${filters.status.length} status`);
    }
    if (filters.priority && filters.priority.length > 0) {
      parts.push(`${filters.priority.length} priority`);
    }
    if (filters.assigneeIds && filters.assigneeIds.length > 0) {
      parts.push(`${filters.assigneeIds.length} assignee`);
    }
    if (filters.epicIds && filters.epicIds.length > 0) {
      parts.push(`${filters.epicIds.length} epic`);
    }
    if (filters.sprintIds && filters.sprintIds.length > 0) {
      parts.push(`${filters.sprintIds.length} sprint`);
    }
    if (filters.labels && filters.labels.length > 0) {
      parts.push(`${filters.labels.length} label`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'No filters';
  };

  return (
    <div className="flex items-center gap-2">
      {/* Save Current Filters */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasActiveFilters}
            className="h-9 gap-2"
          >
            <Save className="h-4 w-4" />
            Save Search
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Save your current filters for quick access later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Search Name *</Label>
              <Input
                id="search-name"
                placeholder="e.g., High Priority Tasks"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="search-description">Description (Optional)</Label>
              <Textarea
                id="search-description"
                placeholder="Describe what this search is for..."
                value={searchDescription}
                onChange={(e) => setSearchDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="is-global" className="font-normal">
                    Share with workspace
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Make this search visible to all workspace members
                </p>
              </div>
              <Switch
                id="is-global"
                checked={isGlobal}
                onCheckedChange={setIsGlobal}
              />
            </div>

            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium mb-2">Current Filters:</p>
              <p className="text-sm text-muted-foreground">
                {getFilterSummary(currentFilters)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSearch}
              disabled={!searchName.trim() || createSearch.isPending}
            >
              {createSearch.isPending ? 'Saving...' : 'Save Search'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Saved Searches Dropdown */}
      {savedSearches.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Star className="h-4 w-4" />
              Saved Searches
              <Badge variant="secondary" className="ml-1">
                {savedSearches.length}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[400px]">
            <ScrollArea className="max-h-[400px]">
              {savedSearches.map((search) => (
                <div key={search.$id} className="group">
                  <div
                    onClick={() => handleApplySearch(search)}
                    className="flex items-start gap-3 px-2 py-2 cursor-pointer hover:bg-accent rounded-md"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">
                          {search.name}
                        </p>
                        {search.isGlobal ? (
                          <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      {search.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {search.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {getFilterSummary(search.filters)}
                        </p>
                        {search.useCount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            {search.useCount}
                          </div>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplySearch(search);
                          }}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Apply Search
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSearch(search.$id);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <DropdownMenuSeparator />
                </div>
              ))}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
