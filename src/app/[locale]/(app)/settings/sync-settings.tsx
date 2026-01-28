'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { useOffline, clearCache } from '@/lib/offline'
import { SyncStatusIndicator, ConflictList } from '@/components/offline'

export function SyncSettings() {
  const { isOnline, syncStatus, syncNow, refreshStatus } = useOffline()
  const [syncing, setSyncing] = useState(false)
  const [clearing, setClearing] = useState(false)

  async function handleSyncNow() {
    setSyncing(true)
    await syncNow()
    setSyncing(false)
  }

  async function handleClearCache() {
    if (!confirm('Clear all cached data? You will need to be online to reload.')) {
      return
    }
    setClearing(true)
    await clearCache()
    await refreshStatus()
    setClearing(false)
  }

  return (
    <div className="space-y-md">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-semantic-positive' : 'bg-neutral-400'
            }`}
          />
          <span className="text-body">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
        <SyncStatusIndicator />
      </div>

      {/* Last sync */}
      {syncStatus?.lastSyncTime && (
        <p className="text-meta text-text-secondary">
          Last synced: {formatTime(syncStatus.lastSyncTime)}
        </p>
      )}

      {/* Conflicts */}
      <ConflictList />

      {/* Actions */}
      <div className="flex gap-sm">
        <Button
          onClick={handleSyncNow}
          loading={syncing}
          disabled={!isOnline}
          className="h-auto py-2"
        >
          Sync now
        </Button>
        <Button
          variant="text"
          onClick={handleClearCache}
          loading={clearing}
          className="h-auto text-meta text-text-secondary"
        >
          Clear cache
        </Button>
      </div>

      {/* Stats */}
      {syncStatus && (
        <div className="pt-sm border-t border-divider text-caption text-text-secondary">
          {syncStatus.pendingCount > 0 && (
            <p>{syncStatus.pendingCount} items waiting to sync</p>
          )}
          {syncStatus.failedCount > 0 && (
            <p className="text-semantic-critical">
              {syncStatus.failedCount} items failed to sync
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function formatTime(date: Date): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`

  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
