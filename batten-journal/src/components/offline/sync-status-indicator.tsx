'use client'

import { useOffline } from '@/lib/offline'

interface SyncStatusIndicatorProps {
  className?: string
}

export function SyncStatusIndicator({ className = '' }: SyncStatusIndicatorProps) {
  const { isOnline, syncStatus } = useOffline()

  if (!syncStatus) return null

  const { pendingCount, failedCount, conflictCount } = syncStatus

  // Nothing to show when all synced
  if (pendingCount === 0 && failedCount === 0 && conflictCount === 0) {
    return null
  }

  return (
    <div className={`flex items-center gap-xs text-meta ${className}`}>
      {/* Pending indicator */}
      {pendingCount > 0 && (
        <span className="flex items-center gap-1 text-text-secondary">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-accent-primary animate-pulse' : 'bg-neutral-400'
            }`}
          />
          {pendingCount} syncing
        </span>
      )}

      {/* Failed indicator */}
      {failedCount > 0 && (
        <span className="flex items-center gap-1 text-semantic-critical">
          <span className="w-2 h-2 rounded-full bg-semantic-critical" />
          {failedCount} failed
        </span>
      )}

      {/* Conflict indicator */}
      {conflictCount > 0 && (
        <span className="flex items-center gap-1 text-semantic-warning">
          <span className="w-2 h-2 rounded-full bg-semantic-warning" />
          {conflictCount} need review
        </span>
      )}
    </div>
  )
}
