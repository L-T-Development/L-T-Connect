/**
 * LocalStorage utilities for workspace management
 * Provides type-safe access to localStorage with error handling
 */

const STORAGE_KEYS = {
    CURRENT_WORKSPACE_ID: 'currentWorkspaceId',
    SIDEBAR_COLLAPSED: 'sidebar-collapsed',
    COMPACT_MODE: 'compact-mode',
    NO_ANIMATIONS: 'no-animations',
} as const;

/**
 * Get current workspace ID from localStorage
 */
export function getCurrentWorkspaceId(): string | null {
    if (typeof window === 'undefined') return null;

    try {
        return localStorage.getItem(STORAGE_KEYS.CURRENT_WORKSPACE_ID);
    } catch (error) {
        console.error('Error reading workspace ID from localStorage:', error);
        return null;
    }
}

/**
 * Set current workspace ID in localStorage
 */
export function setCurrentWorkspaceId(id: string): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_WORKSPACE_ID, id);
    } catch (error) {
        console.error('Error saving workspace ID to localStorage:', error);
    }
}

/**
 * Remove current workspace ID from localStorage
 */
export function removeCurrentWorkspaceId(): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_WORKSPACE_ID);
    } catch (error) {
        console.error('Error removing workspace ID from localStorage:', error);
    }
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
    if (typeof window === 'undefined') return false;

    try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch {
        return false;
    }
}
