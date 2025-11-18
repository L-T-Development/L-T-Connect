import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import type { TaskFilters } from '@/components/search/advanced-filters';

const STORAGE_KEY_PREFIX = 'task-filters-';

export function useFilterPersistence(key: string = 'default') {
  const searchParams = useSearchParams();
  const storageKey = `${STORAGE_KEY_PREFIX}${key}`;

  // Load filters from URL or localStorage
  const loadFilters = React.useCallback((): TaskFilters => {
    // First, try to load from URL query params
    const urlFilters: TaskFilters = {};

    // Status filter
    const statusParam = searchParams.get('status');
    if (statusParam) {
      urlFilters.status = statusParam.split(',') as any;
    }

    // Priority filter
    const priorityParam = searchParams.get('priority');
    if (priorityParam) {
      urlFilters.priority = priorityParam.split(',') as any;
    }

    // Assignee filter
    const assigneeParam = searchParams.get('assignees');
    if (assigneeParam) {
      urlFilters.assigneeIds = assigneeParam.split(',');
    }

    // Epic filter
    const epicParam = searchParams.get('epics');
    if (epicParam) {
      urlFilters.epicIds = epicParam.split(',');
    }

    // Sprint filter
    const sprintParam = searchParams.get('sprints');
    if (sprintParam) {
      urlFilters.sprintIds = sprintParam.split(',');
    }

    // Labels filter
    const labelsParam = searchParams.get('labels');
    if (labelsParam) {
      urlFilters.labels = labelsParam.split(',');
    }

    // Date filters
    const createdFromParam = searchParams.get('createdFrom');
    if (createdFromParam) {
      urlFilters.createdDateFrom = new Date(createdFromParam);
    }

    const createdToParam = searchParams.get('createdTo');
    if (createdToParam) {
      urlFilters.createdDateTo = new Date(createdToParam);
    }

    const dueFromParam = searchParams.get('dueFrom');
    if (dueFromParam) {
      urlFilters.dueDateFrom = new Date(dueFromParam);
    }

    const dueToParam = searchParams.get('dueTo');
    if (dueToParam) {
      urlFilters.dueDateTo = new Date(dueToParam);
    }

    // Boolean filters
    const hasEstimateParam = searchParams.get('hasEstimate');
    if (hasEstimateParam === 'true') {
      urlFilters.hasEstimate = true;
    }

    const isOverdueParam = searchParams.get('overdue');
    if (isOverdueParam === 'true') {
      urlFilters.isOverdue = true;
    }

    const isBlockedParam = searchParams.get('blocked');
    if (isBlockedParam === 'true') {
      urlFilters.isBlocked = true;
    }

    const hasSubtasksParam = searchParams.get('hasSubtasks');
    if (hasSubtasksParam === 'true') {
      urlFilters.hasSubtasks = true;
    }

    // If we have URL filters, return them
    if (Object.keys(urlFilters).length > 0) {
      return urlFilters;
    }

    // Otherwise, try localStorage
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Convert date strings back to Date objects
        if (parsed.createdDateFrom) {
          parsed.createdDateFrom = new Date(parsed.createdDateFrom);
        }
        if (parsed.createdDateTo) {
          parsed.createdDateTo = new Date(parsed.createdDateTo);
        }
        if (parsed.dueDateFrom) {
          parsed.dueDateFrom = new Date(parsed.dueDateFrom);
        }
        if (parsed.dueDateTo) {
          parsed.dueDateTo = new Date(parsed.dueDateTo);
        }
        if (parsed.updatedDateFrom) {
          parsed.updatedDateFrom = new Date(parsed.updatedDateFrom);
        }
        if (parsed.updatedDateTo) {
          parsed.updatedDateTo = new Date(parsed.updatedDateTo);
        }

        return parsed;
      }
    } catch (error) {
      console.error('Failed to load filters from localStorage:', error);
    }

    return {};
  }, [searchParams, storageKey]);

  // Save filters to URL and localStorage
  const saveFilters = React.useCallback(
    (filters: TaskFilters) => {
      // Build URL params
      const params = new URLSearchParams(searchParams.toString());

      // Clear existing filter params
      params.delete('status');
      params.delete('priority');
      params.delete('assignees');
      params.delete('epics');
      params.delete('sprints');
      params.delete('labels');
      params.delete('createdFrom');
      params.delete('createdTo');
      params.delete('dueFrom');
      params.delete('dueTo');
      params.delete('hasEstimate');
      params.delete('overdue');
      params.delete('blocked');
      params.delete('hasSubtasks');

      // Add new filter params
      if (filters.status && filters.status.length > 0) {
        params.set('status', filters.status.join(','));
      }

      if (filters.priority && filters.priority.length > 0) {
        params.set('priority', filters.priority.join(','));
      }

      if (filters.assigneeIds && filters.assigneeIds.length > 0) {
        params.set('assignees', filters.assigneeIds.join(','));
      }

      if (filters.epicIds && filters.epicIds.length > 0) {
        params.set('epics', filters.epicIds.join(','));
      }

      if (filters.sprintIds && filters.sprintIds.length > 0) {
        params.set('sprints', filters.sprintIds.join(','));
      }

      if (filters.labels && filters.labels.length > 0) {
        params.set('labels', filters.labels.join(','));
      }

      if (filters.createdDateFrom) {
        params.set('createdFrom', filters.createdDateFrom.toISOString());
      }

      if (filters.createdDateTo) {
        params.set('createdTo', filters.createdDateTo.toISOString());
      }

      if (filters.dueDateFrom) {
        params.set('dueFrom', filters.dueDateFrom.toISOString());
      }

      if (filters.dueDateTo) {
        params.set('dueTo', filters.dueDateTo.toISOString());
      }

      if (filters.hasEstimate) {
        params.set('hasEstimate', 'true');
      }

      if (filters.isOverdue) {
        params.set('overdue', 'true');
      }

      if (filters.isBlocked) {
        params.set('blocked', 'true');
      }

      if (filters.hasSubtasks) {
        params.set('hasSubtasks', 'true');
      }

      // Update URL (without navigation)
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.pushState({}, '', newUrl);

      // Save to localStorage
      try {
        localStorage.setItem(storageKey, JSON.stringify(filters));
      } catch (error) {
        console.error('Failed to save filters to localStorage:', error);
      }
    },
    [searchParams, storageKey]
  );

  // Clear filters
  const clearFilters = React.useCallback(() => {
    saveFilters({});
  }, [saveFilters]);

  return {
    loadFilters,
    saveFilters,
    clearFilters,
  };
}
