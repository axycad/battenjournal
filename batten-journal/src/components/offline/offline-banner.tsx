'use client'

import { useState } from 'react'
import { useOffline } from '@/lib/offline'

export function OfflineBanner() {
  const { isOnline, syncStatus, syncNow } = useOffline()
  const [showMenu, setShowMenu] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Only show when offline
  if (isOnline) return null

  async function handleSyncNow() {
    setSyncing(true)
    setShowMenu(false)
    await syncNow()
    setSyncing(false)
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-neutral-100 border-b border-neutral-200">
      <div className="max-w-3xl mx-auto px-md py-sm flex items-center justify-between">
        <div className="flex items-center gap-sm">
          {/* Offline icon */}
          <span className="w-2 h-2 rounded-full bg-neutral-400" />
          <div>
            <p className="text-meta font-medium text-text-primary">
              Recording offline
            </p>
            <p className="text-caption text-text-secondary">
              Will sync when you're back online
            </p>
          </div>
        </div>

        {/* Menu toggle */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-text-secondary hover:text-text-primary"
            aria-label="More options"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="8" cy="3" r="1" fill="currentColor" />
              <circle cx="8" cy="8" r="1" fill="currentColor" />
              <circle cx="8" cy="13" r="1" fill="currentColor" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-divider rounded-sm shadow-lg min-w-40">
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="w-full px-sm py-2 text-left text-meta hover:bg-bg-primary disabled:opacity-50"
                >
                  {syncing ? 'Syncing...' : 'Try sync now'}
                </button>
                {syncStatus && (
                  <div className="px-sm py-2 border-t border-divider text-caption text-text-secondary">
                    {syncStatus.pendingCount > 0 && (
                      <p>{syncStatus.pendingCount} pending</p>
                    )}
                    {syncStatus.failedCount > 0 && (
                      <p className="text-semantic-critical">
                        {syncStatus.failedCount} failed
                      </p>
                    )}
                    {syncStatus.conflictCount > 0 && (
                      <p className="text-semantic-warning">
                        {syncStatus.conflictCount} need review
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
