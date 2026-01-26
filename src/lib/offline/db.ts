import Dexie, { type EntityTable } from 'dexie'

// ============================================================================
// TYPES
// ============================================================================

export type SyncStatus = 'queued' | 'syncing' | 'synced' | 'failed' | 'conflict'

export interface CachedEvent {
  id: string // Local ID (cuid-like)
  serverId?: string // Server ID once synced
  caseId: string
  eventType: string
  freeText?: string
  occurredAt: Date
  loggedAt: Date
  authorUserId: string
  authorName?: string
  scopeCodes: string[]
  syncStatus: SyncStatus
  syncAttempts: number
  lastSyncAttempt?: Date
  syncError?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export interface CachedProfile {
  caseId: string
  childDisplayName: string
  legalName?: string
  dateOfBirth?: Date
  nationalId?: string
  bloodType?: string
  weightKg?: number
  heightCm?: number
  emergencyNotes?: string
  allergies: {
    id: string
    substance: string
    severity: string
    reaction?: string
  }[]
  medications: {
    id: string
    name: string
    dose?: string
    schedule?: string
    route?: string
  }[]
  conditions: {
    id: string
    name: string
    notes?: string
  }[]
  careContacts: {
    id: string
    role: string
    name: string
    phone?: string
    address?: string
  }[]
  visionStatus?: string
  mobilityStatus?: string
  communicationStatus?: string
  feedingStatus?: string
  communicationNotes?: string
  keyEquipment?: string
  cachedAt: Date
  syncStatus: SyncStatus
}

export interface OutboxItem {
  id: string // Local queue ID
  type: 'event_create' | 'event_update' | 'event_delete' | 'profile_update'
  caseId: string
  localId: string // Reference to local entity
  payload: Record<string, unknown>
  syncStatus: SyncStatus
  syncAttempts: number
  lastSyncAttempt?: Date
  syncError?: string
  createdAt: Date
}

export interface ConflictRecord {
  id: string
  caseId: string
  entityType: 'event' | 'profile'
  entityId: string
  localVersion: Record<string, unknown>
  serverVersion: Record<string, unknown>
  localUpdatedAt: Date
  serverUpdatedAt: Date
  createdAt: Date
  resolvedAt?: Date
  resolvedBy?: string
  resolution?: 'local' | 'server' | 'merged'
}

export interface CachedScope {
  id: string
  code: string
  label: string
}

export interface SyncMeta {
  key: string
  value: string | number | boolean
  updatedAt: Date
}

// ============================================================================
// DATABASE
// ============================================================================

class OfflineDatabase extends Dexie {
  events!: EntityTable<CachedEvent, 'id'>
  profiles!: EntityTable<CachedProfile, 'caseId'>
  outbox!: EntityTable<OutboxItem, 'id'>
  conflicts!: EntityTable<ConflictRecord, 'id'>
  scopes!: EntityTable<CachedScope, 'id'>
  syncMeta!: EntityTable<SyncMeta, 'key'>

  constructor() {
    super('BattenJournal')

    this.version(1).stores({
      events: 'id, serverId, caseId, syncStatus, occurredAt, [caseId+occurredAt]',
      profiles: 'caseId, syncStatus',
      outbox: 'id, caseId, type, syncStatus, createdAt',
      conflicts: 'id, caseId, entityType, entityId, createdAt, resolvedAt',
      scopes: 'id, code',
      syncMeta: 'key',
    })
  }
}

// Singleton instance
let db: OfflineDatabase | null = null

export function getOfflineDb(): OfflineDatabase {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in browser')
  }
  if (!db) {
    db = new OfflineDatabase()
  }
  return db
}

// ============================================================================
// HELPERS
// ============================================================================

export function generateLocalId(): string {
  // Generate a cuid-like ID for local entities
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `local_${timestamp}${random}`
}

export async function isOnline(): Promise<boolean> {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}
