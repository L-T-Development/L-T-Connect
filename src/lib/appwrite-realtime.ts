import { client } from '@/lib/appwrite-client';
import { RealtimeResponseEvent } from 'appwrite';

/**
 * Appwrite Realtime client utilities
 * Provides a simple interface for subscribing to real-time events
 */

export type RealtimeChannel = 
  | `databases.${string}.collections.${string}.documents`
  | `databases.${string}.collections.${string}.documents.${string}`;

export type RealtimeEvent = 
  | 'create'
  | 'update'
  | 'delete'
  | '*'; // Listen to all events

export interface RealtimeSubscription {
  unsubscribe: () => void;
}

/**
 * Subscribe to real-time updates for a specific channel
 * @param channels - Array of channels to subscribe to
 * @param callback - Function to call when an event is received
 * @returns Subscription object with unsubscribe method
 */
export function subscribeToRealtime(
  channels: RealtimeChannel[],
  callback: (response: RealtimeResponseEvent<any>) => void
): RealtimeSubscription {
  const unsubscribe = client.subscribe(channels, callback);

  return {
    unsubscribe,
  };
}

/**
 * Subscribe to all document events in a collection
 * @param databaseId - The database ID
 * @param collectionId - The collection ID
 * @param callback - Function to call when an event is received
 */
export function subscribeToCollection(
  databaseId: string,
  collectionId: string,
  callback: (response: RealtimeResponseEvent<any>) => void
): RealtimeSubscription {
  const channel: RealtimeChannel = `databases.${databaseId}.collections.${collectionId}.documents`;
  return subscribeToRealtime([channel], callback);
}

/**
 * Subscribe to a specific document
 * @param databaseId - The database ID
 * @param collectionId - The collection ID
 * @param documentId - The document ID
 * @param callback - Function to call when an event is received
 */
export function subscribeToDocument(
  databaseId: string,
  collectionId: string,
  documentId: string,
  callback: (response: RealtimeResponseEvent<any>) => void
): RealtimeSubscription {
  const channel: RealtimeChannel = `databases.${databaseId}.collections.${collectionId}.documents.${documentId}`;
  return subscribeToRealtime([channel], callback);
}

/**
 * Parse Realtime event to determine the event type
 */
export function getRealtimeEventType(
  events: string[]
): 'create' | 'update' | 'delete' | 'unknown' {
  if (events.some(e => e.includes('.create'))) return 'create';
  if (events.some(e => e.includes('.update'))) return 'update';
  if (events.some(e => e.includes('.delete'))) return 'delete';
  return 'unknown';
}

/**
 * Check if an event matches a specific type
 */
export function isRealtimeEvent(
  response: RealtimeResponseEvent<any>,
  type: 'create' | 'update' | 'delete'
): boolean {
  const eventType = getRealtimeEventType(response.events);
  return eventType === type;
}

// Environment variables for database and collections
export const REALTIME_CONFIG = {
  DATABASE_ID: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '',
  COLLECTIONS: {
    COMMENTS: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_TASK_COMMENTS_ID || '',
    NOTIFICATIONS: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_NOTIFICATIONS_ID || '',
    TASKS: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_TASKS_ID || '',
    SPRINTS: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_SPRINTS_ID || '',
    PROJECTS: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_PROJECTS_ID || '',
  },
};

/**
 * Helper to create channel strings
 */
export const createChannels = {
  collection: (collectionId: string) =>
    `databases.${REALTIME_CONFIG.DATABASE_ID}.collections.${collectionId}.documents` as RealtimeChannel,
  
  document: (collectionId: string, documentId: string) =>
    `databases.${REALTIME_CONFIG.DATABASE_ID}.collections.${collectionId}.documents.${documentId}` as RealtimeChannel,
};
