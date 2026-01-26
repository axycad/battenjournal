// Database and types
export {
  getOfflineDb,
  generateLocalId,
  isOnline,
  type CachedEvent,
  type CachedProfile,
  type OutboxItem,
  type ConflictRecord,
  type SyncStatus,
} from './db'

// Sync operations
export {
  createEventOffline,
  updateEventOffline,
  deleteEventOffline,
  cacheProfile,
  getProfileOffline,
  updateProfileOffline,
  cacheScopes,
  getScopesOffline,
  triggerSync,
  processOutbox,
  getConflicts,
  resolveConflict,
  getSyncStatus,
  cacheEventsFromServer,
  clearCache,
  type CreateEventInput,
  type SyncStatusSummary,
} from './sync'

// React context and hooks
export { OfflineProvider, useOffline, useIsOnline, useSyncStatus, useConflicts } from './context'
export {
  useOfflineEvents,
  useOfflineProfile,
  useOfflineScopes,
  useOfflineData,
} from './hooks'

// Service worker
export { useServiceWorker } from './service-worker'
