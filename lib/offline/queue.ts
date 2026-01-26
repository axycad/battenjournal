import { getOfflineDb, generateLocalId, type OutboxItem, type SyncStatus } from './db'

// ============================================================================
// QUEUE OPERATIONS
// ============================================================================

export async function addToOutbox(
  type: OutboxItem['type'],
  caseId: string,
  localId: string,
  payload: Record<string, unknown>
): Promise<string> {
  const db = getOfflineDb()
  const id = generateLocalId()

  const item: OutboxItem = {
    id,
    type,
    caseId,
    localId,
    payload,
    syncStatus: 'queued',
    syncAttempts: 0,
    createdAt: new Date(),
  }

  await db.outbox.add(item)
  return id
}

export async function getQueuedItems(): Promise<OutboxItem[]> {
  const db = getOfflineDb()
  return db.outbox
    .where('syncStatus')
    .anyOf(['queued', 'failed'])
    .sortBy('createdAt')
}

export async function getPendingCount(): Promise<number> {
  const db = getOfflineDb()
  return db.outbox
    .where('syncStatus')
    .anyOf(['queued', 'syncing', 'failed'])
    .count()
}

export async function getConflictCount(caseId?: string): Promise<number> {
  const db = getOfflineDb()
  let query = db.outbox.where('syncStatus').equals('conflict')
  if (caseId) {
    const items = await query.toArray()
    return items.filter(i => i.caseId === caseId).length
  }
  return query.count()
}

export async function updateOutboxStatus(
  id: string,
  status: SyncStatus,
  error?: string
): Promise<void> {
  const db = getOfflineDb()
  await db.outbox.update(id, {
    syncStatus: status,
    syncAttempts: (await db.outbox.get(id))?.syncAttempts ?? 0 + 1,
    lastSyncAttempt: new Date(),
    syncError: error,
  })
}

export async function markSynced(id: string, serverId?: string): Promise<void> {
  const db = getOfflineDb()
  const item = await db.outbox.get(id)
  
  if (item) {
    // Update the local entity with server ID if applicable
    if (serverId && item.type === 'event_create') {
      await db.events.update(item.localId, { serverId, syncStatus: 'synced' })
    }
    
    // Remove from outbox
    await db.outbox.delete(id)
  }
}

export async function removeFromOutbox(id: string): Promise<void> {
  const db = getOfflineDb()
  await db.outbox.delete(id)
}

export async function clearOutbox(): Promise<void> {
  const db = getOfflineDb()
  await db.outbox.clear()
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

const MAX_RETRY_ATTEMPTS = 5
const RETRY_BACKOFF_MS = [1000, 5000, 15000, 60000, 300000] // 1s, 5s, 15s, 1m, 5m

export function shouldRetry(item: OutboxItem): boolean {
  return item.syncAttempts < MAX_RETRY_ATTEMPTS
}

export function getRetryDelay(attempts: number): number {
  const index = Math.min(attempts, RETRY_BACKOFF_MS.length - 1)
  return RETRY_BACKOFF_MS[index]
}

export async function getItemsReadyForRetry(): Promise<OutboxItem[]> {
  const db = getOfflineDb()
  const failed = await db.outbox
    .where('syncStatus')
    .equals('failed')
    .toArray()

  const now = Date.now()
  return failed.filter(item => {
    if (!shouldRetry(item)) return false
    if (!item.lastSyncAttempt) return true
    
    const delay = getRetryDelay(item.syncAttempts)
    const retryAfter = item.lastSyncAttempt.getTime() + delay
    return now >= retryAfter
  })
}
