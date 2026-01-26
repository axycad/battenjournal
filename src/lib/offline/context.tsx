'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import {
  processOutbox,
  getSyncStatus,
  getConflicts,
  type SyncStatusSummary,
} from './sync'
import type { ConflictRecord } from './db'

interface OfflineContextValue {
  isOnline: boolean
  syncStatus: SyncStatusSummary | null
  conflicts: ConflictRecord[]
  syncNow: () => Promise<void>
  refreshStatus: () => Promise<void>
}

const OfflineContext = createContext<OfflineContextValue | null>(null)

interface OfflineProviderProps {
  children: ReactNode
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatusSummary | null>(null)
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([])
  const [isSyncing, setIsSyncing] = useState(false)

  // Update online status
  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOnline(navigator.onLine)

    function handleOnline() {
      setIsOnline(true)
      // Trigger sync when coming online
      syncNow()
    }

    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Refresh status periodically
  const refreshStatus = useCallback(async () => {
    try {
      const [status, unresolvedConflicts] = await Promise.all([
        getSyncStatus(),
        getConflicts(),
      ])
      setSyncStatus(status)
      setConflicts(unresolvedConflicts)
    } catch (error) {
      console.error('Failed to refresh sync status:', error)
    }
  }, [])

  // Initial status load and periodic refresh
  useEffect(() => {
    if (typeof window === 'undefined') return

    refreshStatus()

    // Refresh every 30 seconds
    const interval = setInterval(refreshStatus, 30000)

    return () => clearInterval(interval)
  }, [refreshStatus])

  // Sync function
  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) return

    setIsSyncing(true)
    try {
      await processOutbox()
      await refreshStatus()
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, isOnline, refreshStatus])

  // Auto-sync on mount if online
  useEffect(() => {
    if (isOnline) {
      syncNow()
    }
  }, []) // Only on mount

  const value: OfflineContextValue = {
    isOnline,
    syncStatus,
    conflicts,
    syncNow,
    refreshStatus,
  }

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  )
}

export function useOffline(): OfflineContextValue {
  const context = useContext(OfflineContext)
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider')
  }
  return context
}

export function useIsOnline(): boolean {
  const { isOnline } = useOffline()
  return isOnline
}

export function useSyncStatus(): SyncStatusSummary | null {
  const { syncStatus } = useOffline()
  return syncStatus
}

export function useConflicts(): ConflictRecord[] {
  const { conflicts } = useOffline()
  return conflicts
}
