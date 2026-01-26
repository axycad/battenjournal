'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { useOffline } from '@/lib/offline/context'
import { ConflictList } from '@/components/conflict-resolution'
import { clearCache } from '@/lib/offline/sync'

export default function SyncSettingsPage() {
  const { isOnline, syncStatus, conflicts, syncNow, refreshStatus } = useOffline()
  const [syncing, setSyncing] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  // Check if installed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      setIsInstalled(isStandalone)
    }
  }, [])

  // Capture install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleSync() {
    setSyncing(true)
    try {
      await syncNow()
    } finally {
      setSyncing(false)
    }
  }

  async function handleClearCache() {
    if (!confirm('This will clear all offline data. You will need to re-download data when online.')) {
      return
    }

    setClearing(true)
    try {
      await clearCache()
      await refreshStatus()
    } finally {
      setClearing(false)
    }
  }

  async function handleInstall() {
    if (!installPrompt) return

    const result = await installPrompt.prompt()
    if (result.outcome === 'accepted') {
      setInstallPrompt(null)
      setIsInstalled(true)
    }
  }

  function formatDate(date: Date | undefined): string {
    if (!date) return 'Never'
    return new Date(date).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href="/dashboard"
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          ← Back to dashboard
        </Link>
        <h1 className="screen-title mt-xs">Sync &amp; offline</h1>
      </div>

      <div className="space-y-lg">
        {/* Status */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-md">Status</h2>
          
          <div className="space-y-sm">
            <div className="flex items-center justify-between">
              <span className="text-body">Connection</span>
              <span className={`text-body ${isOnline ? 'text-semantic-success' : 'text-text-secondary'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-body">Pending items</span>
              <span className="text-body">
                {(syncStatus?.pendingCount ?? 0) + (syncStatus?.failedCount ?? 0)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-body">Needs review</span>
              <span className={`text-body ${conflicts.length > 0 ? 'text-semantic-warning' : ''}`}>
                {conflicts.length}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-body">Last sync</span>
              <span className="text-body text-text-secondary">
                {formatDate(syncStatus?.lastSyncTime)}
              </span>
            </div>
          </div>

          <div className="flex gap-sm mt-md pt-md border-t border-divider">
            <Button onClick={handleSync} loading={syncing} disabled={!isOnline}>
              Sync now
            </Button>
            <Button variant="secondary" onClick={handleClearCache} loading={clearing}>
              Clear offline data
            </Button>
          </div>
        </section>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <section className="p-md bg-white border border-divider rounded-md">
            <h2 className="section-header mb-md">Items needing review</h2>
            <p className="text-meta text-text-secondary mb-md">
              These items have changes from multiple devices. Choose which version to keep.
            </p>
            <ConflictList conflicts={conflicts} onResolved={refreshStatus} />
          </section>
        )}

        {/* Install app */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-md">Install app</h2>
          
          {isInstalled ? (
            <p className="text-body text-text-secondary">
              Batten Journal is installed on this device.
            </p>
          ) : installPrompt ? (
            <div>
              <p className="text-body text-text-secondary mb-sm">
                Install Batten Journal on your home screen for quick access and a better offline experience.
              </p>
              <Button onClick={handleInstall}>Install Batten Journal</Button>
            </div>
          ) : (
            <p className="text-body text-text-secondary">
              To install, use your browser's "Add to Home Screen" option in the menu.
            </p>
          )}
        </section>

        {/* How offline works */}
        <section className="p-md bg-bg-primary border border-divider rounded-md">
          <h2 className="text-body font-medium mb-sm">How offline works</h2>
          <ul className="space-y-xs text-meta text-text-secondary">
            <li>Observations are saved locally and sync when online</li>
            <li>Profile and emergency data are available offline</li>
            <li>Documents and photos work if previously viewed</li>
            <li>If edits conflict, you'll be asked to choose which to keep</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

// TypeScript interface for the install prompt
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>
}