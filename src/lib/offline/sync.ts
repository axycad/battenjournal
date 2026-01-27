import {
  getOfflineDb,
  generateLocalId,
  isOnline,
  type CachedEvent,
  type CachedProfile,
  type OutboxItem,
  type ConflictRecord,
  type SyncStatus,
} from './db'

export type { ConflictRecord } from './db'

// ============================================================================
// EVENT OPERATIONS
// ============================================================================

export interface CreateEventInput {
  caseId: string
  eventType: string
  freeText?: string
  occurredAt?: Date
  scopeCodes: string[]
  authorUserId: string
  authorName?: string
}

export async function createEventOffline(input: CreateEventInput): Promise<CachedEvent> {
  const db = getOfflineDb()
  const now = new Date()
  const localId = generateLocalId()

  const event: CachedEvent = {
    id: localId,
    caseId: input.caseId,
    eventType: input.eventType,
    freeText: input.freeText,
    occurredAt: input.occurredAt || now,
    loggedAt: now,
    authorUserId: input.authorUserId,
    authorName: input.authorName,
    scopeCodes: input.scopeCodes,
    syncStatus: 'queued',
    syncAttempts: 0,
    createdAt: now,
    updatedAt: now,
  }

  // Save to local cache
  await db.events.add(event)

  // Add to outbox
  await db.outbox.add({
    id: generateLocalId(),
    type: 'event_create',
    caseId: input.caseId,
    localId,
    payload: {
      eventType: input.eventType,
      freeText: input.freeText,
      occurredAt: input.occurredAt?.toISOString() || now.toISOString(),
      scopeCodes: input.scopeCodes,
    },
    syncStatus: 'queued',
    syncAttempts: 0,
    createdAt: now,
  })

  // Trigger sync if online
  if (await isOnline()) {
    triggerSync()
  }

  return event
}

export async function updateEventOffline(
  localId: string,
  updates: {
    freeText?: string
    occurredAt?: Date
    scopeCodes?: string[]
  }
): Promise<void> {
  const db = getOfflineDb()
  const event = await db.events.get(localId)

  if (!event) {
    throw new Error('Event not found')
  }

  const now = new Date()

  // Update local cache
  await db.events.update(localId, {
    ...updates,
    syncStatus: event.serverId ? 'queued' : event.syncStatus,
    updatedAt: now,
  })

  // If synced to server, queue update
  if (event.serverId) {
    await db.outbox.add({
      id: generateLocalId(),
      type: 'event_update',
      caseId: event.caseId,
      localId,
      payload: {
        serverId: event.serverId,
        freeText: updates.freeText,
        occurredAt: updates.occurredAt?.toISOString(),
        scopeCodes: updates.scopeCodes,
      },
      syncStatus: 'queued',
      syncAttempts: 0,
      createdAt: now,
    })

    if (await isOnline()) {
      triggerSync()
    }
  }
}

export async function deleteEventOffline(localId: string): Promise<void> {
  const db = getOfflineDb()
  const event = await db.events.get(localId)

  if (!event) return

  const now = new Date()

  // Mark as deleted locally
  await db.events.update(localId, {
    deletedAt: now,
    syncStatus: event.serverId ? 'queued' : 'synced',
  })

  // If synced to server, queue delete
  if (event.serverId) {
    await db.outbox.add({
      id: generateLocalId(),
      type: 'event_delete',
      caseId: event.caseId,
      localId,
      payload: { serverId: event.serverId },
      syncStatus: 'queued',
      syncAttempts: 0,
      createdAt: now,
    })

    if (await isOnline()) {
      triggerSync()
    }
  }
}

export async function getEventsOffline(caseId: string): Promise<CachedEvent[]> {
  const db = getOfflineDb()
  return db.events
    .where('caseId')
    .equals(caseId)
    .filter((e) => !e.deletedAt)
    .reverse()
    .sortBy('occurredAt')
}

// ============================================================================
// PROFILE OPERATIONS
// ============================================================================

export async function cacheProfile(profile: CachedProfile): Promise<void> {
  const db = getOfflineDb()
  await db.profiles.put({
    ...profile,
    cachedAt: new Date(),
    syncStatus: 'synced',
  })
}

export async function getProfileOffline(caseId: string): Promise<CachedProfile | undefined> {
  const db = getOfflineDb()
  return db.profiles.get(caseId)
}

export async function updateProfileOffline(
  caseId: string,
  updates: Partial<CachedProfile>
): Promise<void> {
  const db = getOfflineDb()
  const profile = await db.profiles.get(caseId)

  if (!profile) {
    throw new Error('Profile not found in cache')
  }

  const now = new Date()

  // Update local cache
  await db.profiles.update(caseId, {
    ...updates,
    syncStatus: 'queued',
    cachedAt: now,
  })

  // Queue update
  await db.outbox.add({
    id: generateLocalId(),
    type: 'profile_update',
    caseId,
    localId: caseId,
    payload: updates as Record<string, unknown>,
    syncStatus: 'queued',
    syncAttempts: 0,
    createdAt: now,
  })

  if (await isOnline()) {
    triggerSync()
  }
}

// ============================================================================
// SCOPE CACHING
// ============================================================================

export async function cacheScopes(
  scopes: { id: string; code: string; label: string }[]
): Promise<void> {
  const db = getOfflineDb()
  await db.scopes.bulkPut(scopes)
}

export async function getScopesOffline(): Promise<{ id: string; code: string; label: string }[]> {
  const db = getOfflineDb()
  return db.scopes.toArray()
}

// ============================================================================
// SYNC ENGINE
// ============================================================================

let syncInProgress = false
let syncTimeout: NodeJS.Timeout | null = null

export function triggerSync(): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout)
  }
  // Debounce sync calls
  syncTimeout = setTimeout(() => processOutbox(), 500)
}

export async function processOutbox(): Promise<{
  processed: number
  failed: number
  conflicts: number
}> {
  if (syncInProgress) {
    return { processed: 0, failed: 0, conflicts: 0 }
  }

  if (!(await isOnline())) {
    return { processed: 0, failed: 0, conflicts: 0 }
  }

  syncInProgress = true
  const db = getOfflineDb()

  let processed = 0
  let failed = 0
  let conflicts = 0

  try {
    // Get all queued items
    const items = await db.outbox
      .where('syncStatus')
      .equals('queued')
      .sortBy('createdAt')

    for (const item of items) {
      // Mark as syncing
      await db.outbox.update(item.id, {
        syncStatus: 'syncing' as SyncStatus,
        lastSyncAttempt: new Date(),
        syncAttempts: item.syncAttempts + 1,
      })

      try {
        const result = await syncItem(item)

        if (result.success) {
          // Remove from outbox
          await db.outbox.delete(item.id)

          // Update local entity status
          if (item.type === 'event_create' && result.serverId) {
            await db.events.update(item.localId, {
              serverId: result.serverId,
              syncStatus: 'synced' as SyncStatus,
            })
          } else if (item.type.startsWith('event_')) {
            await db.events.update(item.localId, {
              syncStatus: 'synced' as SyncStatus,
            })
          } else if (item.type === 'profile_update') {
            await db.profiles.update(item.caseId, {
              syncStatus: 'synced' as SyncStatus,
            })
          }

          processed++
        } else if (result.conflict) {
          // Create conflict record
          await createConflict(item, result.serverVersion!)
          await db.outbox.update(item.id, {
            syncStatus: 'conflict' as SyncStatus,
          })
          conflicts++
        } else {
          // Mark as failed
          await db.outbox.update(item.id, {
            syncStatus: item.syncAttempts >= 3 ? 'failed' : 'queued',
            syncError: result.error,
          })
          failed++
        }
      } catch (error) {
        await db.outbox.update(item.id, {
          syncStatus: item.syncAttempts >= 3 ? 'failed' : 'queued',
          syncError: error instanceof Error ? error.message : 'Unknown error',
        })
        failed++
      }
    }

    // Update last sync time
    await db.syncMeta.put({
      key: 'lastSync',
      value: Date.now(),
      updatedAt: new Date(),
    })
  } finally {
    syncInProgress = false
  }

  return { processed, failed, conflicts }
}

interface SyncResult {
  success: boolean
  serverId?: string
  conflict?: boolean
  serverVersion?: Record<string, unknown>
  error?: string
}

async function syncItem(item: OutboxItem): Promise<SyncResult> {
  const endpoint = getSyncEndpoint(item.type)
  const method = getSyncMethod(item.type)

  try {
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...item.payload,
        caseId: item.caseId,
        localId: item.localId,
      }),
    })

    const data = await response.json()

    if (response.status === 409) {
      // Conflict detected
      return {
        success: false,
        conflict: true,
        serverVersion: data.serverVersion,
      }
    }

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Sync failed',
      }
    }

    return {
      success: true,
      serverId: data.id || data.eventId,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

function getSyncEndpoint(type: OutboxItem['type']): string {
  switch (type) {
    case 'event_create':
      return '/api/sync/events'
    case 'event_update':
      return '/api/sync/events'
    case 'event_delete':
      return '/api/sync/events/delete'
    case 'profile_update':
      return '/api/sync/profile'
    default:
      throw new Error(`Unknown sync type: ${type}`)
  }
}

function getSyncMethod(type: OutboxItem['type']): string {
  switch (type) {
    case 'event_create':
      return 'POST'
    case 'event_update':
      return 'PUT'
    case 'event_delete':
      return 'DELETE'
    case 'profile_update':
      return 'PUT'
    default:
      return 'POST'
  }
}

// ============================================================================
// CONFLICT HANDLING
// ============================================================================

async function createConflict(
  item: OutboxItem,
  serverVersion: Record<string, unknown>
): Promise<void> {
  const db = getOfflineDb()

  // Get local version
  let localVersion: Record<string, unknown> = {}
  let localUpdatedAt = new Date()

  if (item.type.startsWith('event_')) {
    const event = await db.events.get(item.localId)
    if (event) {
      localVersion = { ...event }
      localUpdatedAt = event.updatedAt
    }
  } else if (item.type === 'profile_update') {
    const profile = await db.profiles.get(item.caseId)
    if (profile) {
      localVersion = { ...profile }
      localUpdatedAt = profile.cachedAt
    }
  }

  const conflict: ConflictRecord = {
    id: generateLocalId(),
    caseId: item.caseId,
    entityType: item.type.startsWith('event_') ? 'event' : 'profile',
    entityId: item.localId,
    localVersion,
    serverVersion,
    localUpdatedAt,
    serverUpdatedAt: new Date(serverVersion.updatedAt as string || Date.now()),
    createdAt: new Date(),
  }

  await db.conflicts.add(conflict)

  // Mark entity as having conflict
  if (item.type.startsWith('event_')) {
    await db.events.update(item.localId, { syncStatus: 'conflict' })
  } else if (item.type === 'profile_update') {
    await db.profiles.update(item.caseId, { syncStatus: 'conflict' })
  }
}

export async function getConflicts(caseId?: string): Promise<ConflictRecord[]> {
  const db = getOfflineDb()
  let query = db.conflicts.filter(c => !c.resolvedAt)

  if (caseId) {
    return query.filter((c) => c.caseId === caseId).toArray()
  }

  return query.toArray()
}

export async function resolveConflict(
  conflictId: string,
  resolution: 'local' | 'server' | 'merged',
  mergedData?: Record<string, unknown>,
  resolvedByUserId?: string
): Promise<void> {
  const db = getOfflineDb()
  const conflict = await db.conflicts.get(conflictId)

  if (!conflict) {
    throw new Error('Conflict not found')
  }

  const now = new Date()

  // Apply resolution
  if (conflict.entityType === 'event') {
    const dataToApply =
      resolution === 'local'
        ? conflict.localVersion
        : resolution === 'server'
        ? conflict.serverVersion
        : mergedData!

    await db.events.update(conflict.entityId, {
      ...dataToApply,
      syncStatus: 'queued' as SyncStatus,
      updatedAt: now,
    })

    // Re-queue for sync if using local or merged
    if (resolution !== 'server') {
      const event = await db.events.get(conflict.entityId)
      if (event?.serverId) {
        await db.outbox.add({
          id: generateLocalId(),
          type: 'event_update',
          caseId: conflict.caseId,
          localId: conflict.entityId,
          payload: {
            serverId: event.serverId,
            ...dataToApply,
          },
          syncStatus: 'queued',
          syncAttempts: 0,
          createdAt: now,
        })
      }
    } else {
      // Using server version, just mark as synced
      await db.events.update(conflict.entityId, { syncStatus: 'synced' })
    }
  } else if (conflict.entityType === 'profile') {
    const dataToApply =
      resolution === 'local'
        ? conflict.localVersion
        : resolution === 'server'
        ? conflict.serverVersion
        : mergedData!

    await db.profiles.update(conflict.caseId, {
      ...dataToApply,
      syncStatus: resolution === 'server' ? 'synced' : 'queued',
      cachedAt: now,
    })

    if (resolution !== 'server') {
      await db.outbox.add({
        id: generateLocalId(),
        type: 'profile_update',
        caseId: conflict.caseId,
        localId: conflict.caseId,
        payload: dataToApply,
        syncStatus: 'queued',
        syncAttempts: 0,
        createdAt: now,
      })
    }
  }

  // Remove from outbox if present
  await db.outbox
    .where('localId')
    .equals(conflict.entityId)
    .and((item) => item.syncStatus === 'conflict')
    .delete()

  // Mark conflict as resolved
  await db.conflicts.update(conflictId, {
    resolvedAt: now,
    resolvedBy: resolvedByUserId,
    resolution,
  })

  // Trigger sync for re-queued items
  if (resolution !== 'server' && (await isOnline())) {
    triggerSync()
  }
}

// ============================================================================
// SYNC STATUS
// ============================================================================

export interface SyncStatusSummary {
  isOnline: boolean
  pendingCount: number
  failedCount: number
  conflictCount: number
  lastSyncTime?: Date
}

export async function getSyncStatus(): Promise<SyncStatusSummary> {
  const db = getOfflineDb()
  const online = await isOnline()

  const [pending, failed, conflicts, lastSyncMeta] = await Promise.all([
    db.outbox.where('syncStatus').equals('queued').count(),
    db.outbox.where('syncStatus').equals('failed').count(),
    db.conflicts.filter(c => !c.resolvedAt).count(),
    db.syncMeta.get('lastSync'),
  ])

  return {
    isOnline: online,
    pendingCount: pending,
    failedCount: failed,
    conflictCount: conflicts,
    lastSyncTime: lastSyncMeta ? new Date(lastSyncMeta.value as number) : undefined,
  }
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

export async function cacheEventsFromServer(
  caseId: string,
  events: {
    id: string
    eventType: string
    freeText?: string | null
    occurredAt: Date
    loggedAt: Date
    authorUserId: string
    authorName?: string | null
    scopeCodes: string[]
  }[]
): Promise<void> {
  const db = getOfflineDb()

  for (const event of events) {
    // Check if we have a local version
    const existing = await db.events
      .where('serverId')
      .equals(event.id)
      .first()

    if (existing) {
      // Update if server version is newer and no local changes pending
      if (existing.syncStatus === 'synced') {
        await db.events.update(existing.id, {
          eventType: event.eventType,
          freeText: event.freeText || undefined,
          occurredAt: new Date(event.occurredAt),
          loggedAt: new Date(event.loggedAt),
          scopeCodes: event.scopeCodes,
          updatedAt: new Date(),
        })
      }
    } else {
      // Add new cached event
      await db.events.add({
        id: generateLocalId(),
        serverId: event.id,
        caseId,
        eventType: event.eventType,
        freeText: event.freeText || undefined,
        occurredAt: new Date(event.occurredAt),
        loggedAt: new Date(event.loggedAt),
        authorUserId: event.authorUserId,
        authorName: event.authorName || undefined,
        scopeCodes: event.scopeCodes,
        syncStatus: 'synced',
        syncAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  }
}

export async function clearCache(caseId?: string): Promise<void> {
  const db = getOfflineDb()

  if (caseId) {
    await db.events.where('caseId').equals(caseId).delete()
    await db.profiles.delete(caseId)
    await db.outbox.where('caseId').equals(caseId).delete()
    await db.conflicts.where('caseId').equals(caseId).delete()
  } else {
    await db.events.clear()
    await db.profiles.clear()
    await db.outbox.clear()
    await db.conflicts.clear()
    await db.scopes.clear()
    await db.syncMeta.clear()
  }
}

