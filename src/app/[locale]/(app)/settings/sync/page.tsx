'use client'

import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {Link} from '@/navigation'
import { Button } from '@/components/ui'
import { useOffline } from '@/lib/offline/context'
import { ConflictList } from '@/components/conflict-resolution'
import { clearCache } from '@/lib/offline/sync'

export default function SyncSettingsPage() {
  const t = useTranslations('settingsSync')
  const locale = useLocale()
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
    if (!confirm(t('confirmClearCache'))) {
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
    if (!date) return t('never')
    return new Date(date).toLocaleString(locale, {
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
          â† {t('backToDashboard')}
        </Link>
        <h1 className="screen-title mt-xs">{t('title')}</h1>
      </div>

      <div className="space-y-lg">
        {/* Status */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-md">{t('statusTitle')}</h2>
          
          <div className="space-y-sm">
            <div className="flex items-center justify-between">
              <span className="text-body">{t('connection')}</span>
              <span className={`text-body ${isOnline ? 'text-semantic-success' : 'text-text-secondary'}`}>
                {isOnline ? t('online') : t('offline')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-body">{t('pendingItems')}</span>
              <span className="text-body">
                {(syncStatus?.pendingCount ?? 0) + (syncStatus?.failedCount ?? 0)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-body">{t('needsReview')}</span>
              <span className={`text-body ${conflicts.length > 0 ? 'text-semantic-warning' : ''}`}>
                {conflicts.length}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-body">{t('lastSync')}</span>
              <span className="text-body text-text-secondary">
                {formatDate(syncStatus?.lastSyncTime)}
              </span>
            </div>
          </div>

          <div className="flex gap-sm mt-md pt-md border-t border-divider">
            <Button onClick={handleSync} loading={syncing} disabled={!isOnline}>
              {t('syncNow')}
            </Button>
            <Button variant="secondary" onClick={handleClearCache} loading={clearing}>
              {t('clearOffline')}
            </Button>
          </div>
        </section>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <section className="p-md bg-white border border-divider rounded-md">
            <h2 className="section-header mb-md">{t('conflictsTitle')}</h2>
            <p className="text-meta text-text-secondary mb-md">
              {t('conflictsDescription')}
            </p>
            <ConflictList conflicts={conflicts} onResolved={refreshStatus} />
          </section>
        )}

        {/* Install app */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-md">{t('installTitle')}</h2>
          
          {isInstalled ? (
            <p className="text-body text-text-secondary">
              {t('installInstalled')}
            </p>
          ) : installPrompt ? (
            <div>
              <p className="text-body text-text-secondary mb-sm">
                {t('installPrompt')}
              </p>
              <Button onClick={handleInstall}>{t('installButton')}</Button>
            </div>
          ) : (
            <p className="text-body text-text-secondary">
              {t('installHint')}
            </p>
          )}
        </section>

        {/* How offline works */}
        <section className="p-md bg-bg-primary border border-divider rounded-md">
          <h2 className="text-body font-medium mb-sm">{t('offlineTitle')}</h2>
          <ul className="space-y-xs text-meta text-text-secondary">
            <li>{t('offlineItem1')}</li>
            <li>{t('offlineItem2')}</li>
            <li>{t('offlineItem3')}</li>
            <li>{t('offlineItem4')}</li>
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
