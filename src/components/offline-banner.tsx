'use client'

import { useState } from 'react'
import { useOffline } from '@/lib/offline/context'
import { Button } from '@/components/ui'

export function OfflineBanner() {
  const { isOnline, syncStatus, syncNow, conflicts } = useOffline()
  const [expanded, setExpanded] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Don't show if online and no pending items
  if (isOnline && !syncStatus?.pendingCount && !syncStatus?.failedCount && !conflicts.length) {
    return null
  }

  const hasPending = (syncStatus?.pendingCount ?? 0) > 0
  const hasFailed = (syncStatus?.failedCount ?? 0) > 0
  const hasConflicts = conflicts.length > 0

  async function handleSync() {
    setSyncing(true)
    try {
      await syncNow()
    } finally {
      setSyncing(false)
    }
  }

  // Offline banner - prominent but calm
  if (!isOnline) {
    return (
      <div className="bg-bg-secondary border-b border-divider">
        <div className="max-w-3xl mx-auto px-md py-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-sm">
              <span className="w-2 h-2 bg-text-secondary rounded-full" />
              <div>
                <p className="text-body text-text-primary">Recording offline</p>
                <p className="text-meta text-text-secondary">
                  Will sync when you're back online
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-meta text-text-secondary hover:text-text-primary"
            >
              {expanded ? 'Less' : 'More'}
            </button>
          </div>

          {expanded && (
            <div className="mt-sm pt-sm border-t border-divider">
              <p className="text-meta text-text-secondary">
                {hasPending && `${syncStatus?.pendingCount} items waiting to sync`}
                {hasPending && hasConflicts && ' · '}
                {hasConflicts && `${conflicts.length} items need review`}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Online but has pending/failed/conflicts
  if (hasPending || hasFailed || hasConflicts) {
    return (
      <div className="bg-bg-secondary border-b border-divider">
        <div className="max-w-3xl mx-auto px-md py-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-sm">
              {hasFailed || hasConflicts ? (
                <span className="w-2 h-2 bg-semantic-warning rounded-full" />
              ) : (
                <span className="w-2 h-2 bg-accent-primary rounded-full animate-pulse" />
              )}
              <div>
                {hasConflicts ? (
                  <>
                    <p className="text-body text-text-primary">Needs review</p>
                    <p className="text-meta text-text-secondary">
                      {conflicts.length} item{conflicts.length !== 1 ? 's' : ''} have changes from multiple devices
                    </p>
                  </>
                ) : hasFailed ? (
                  <>
                    <p className="text-body text-text-primary">Sync issue</p>
                    <p className="text-meta text-text-secondary">
                      {syncStatus?.failedCount} item{(syncStatus?.failedCount ?? 0) !== 1 ? 's' : ''} couldn't be synced
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-body text-text-primary">Syncing</p>
                    <p className="text-meta text-text-secondary">
                      {syncStatus?.pendingCount} item{(syncStatus?.pendingCount ?? 0) !== 1 ? 's' : ''} waiting
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-sm">
              {hasConflicts && (
                <a
                  href="/settings/sync"
                  className="text-meta text-accent-primary hover:underline"
                >
                  Review
                </a>
              )}
              <Button
                variant="text"
                onClick={handleSync}
                loading={syncing}
                className="h-auto py-1 px-0 text-meta"
              >
                Sync now
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
