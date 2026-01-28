'use client'

import { useState, useEffect } from 'react'
import {Link} from '@/navigation'

// ============================================================================
// TYPES
// ============================================================================

interface SyncStatus {
  pendingCount: number
  failedCount: number
  conflictCount: number
  lastSyncAt: Date | null
  isOnline: boolean
}

// ============================================================================
// SYNC STATUS INDICATOR
// ============================================================================

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatus>({
    pendingCount: 0,
    failedCount: 0,
    conflictCount: 0,
    lastSyncAt: null,
    isOnline: true,
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check online status
    const updateOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: navigator.onLine }))
    }

    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    updateOnline()

    // Check IndexedDB sync status
    async function checkSyncStatus() {
      try {
        // Dynamic import to avoid SSR issues
        const { getOfflineDb } = await import('@/lib/offline/db')
        const db = getOfflineDb()

        const pending = await db.outbox
          .where('syncStatus')
          .anyOf(['queued', 'syncing'])
          .count()

        const failed = await db.outbox
          .where('syncStatus')
          .equals('failed')
          .count()

        const conflicts = await db.conflicts
          .filter((c) => !c.resolvedAt)
          .count()

        setStatus((prev) => ({
          ...prev,
          pendingCount: pending,
          failedCount: failed,
          conflictCount: conflicts,
        }))
      } catch {
        // IndexedDB not available
      }
    }

    checkSyncStatus()

    // Poll for updates
    const interval = setInterval(checkSyncStatus, 5000)

    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
      clearInterval(interval)
    }
  }, [])

  if (!mounted) return null

  const hasIssues = status.failedCount > 0 || status.conflictCount > 0
  const hasPending = status.pendingCount > 0
  const isOffline = !status.isOnline

  // Nothing to show
  if (!hasIssues && !hasPending && !isOffline) return null

  return (
    <Link
      href="/settings/sync"
      className="flex items-center gap-xs px-sm py-1 rounded-sm text-meta transition-colors hover:bg-bg-secondary"
    >
      {isOffline && (
        <span className="flex items-center gap-xs text-semantic-warning">
          <OfflineIcon className="w-4 h-4" />
          Offline
        </span>
      )}

      {!isOffline && hasPending && !hasIssues && (
        <span className="flex items-center gap-xs text-text-secondary">
          <SyncingIcon className="w-4 h-4 animate-spin" />
          Syncing {status.pendingCount}
        </span>
      )}

      {status.failedCount > 0 && (
        <span className="flex items-center gap-xs text-semantic-critical">
          <FailedIcon className="w-4 h-4" />
          {status.failedCount} failed
        </span>
      )}

      {status.conflictCount > 0 && (
        <span className="flex items-center gap-xs text-semantic-warning">
          <ConflictIcon className="w-4 h-4" />
          {status.conflictCount} conflict{status.conflictCount !== 1 ? 's' : ''}
        </span>
      )}
    </Link>
  )
}

// ============================================================================
// OFFLINE BANNER
// ============================================================================

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsOffline(!navigator.onLine)

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!mounted || !isOffline) return null

  return (
    <div className="bg-semantic-warning/10 border-b border-semantic-warning/30 px-md py-sm">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <OfflineIcon className="w-4 h-4 text-semantic-warning" />
          <span className="text-meta text-semantic-warning">
            You're offline. Changes will sync when you reconnect.
          </span>
        </div>
        <Link
          href="/settings/sync"
          className="text-meta text-semantic-warning underline hover:no-underline"
        >
          View queue
        </Link>
      </div>
    </div>
  )
}

// ============================================================================
// SYNC FAILED BANNER
// ============================================================================

export function SyncFailedBanner() {
  const [failedCount, setFailedCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    async function checkFailed() {
      try {
        const { getOfflineDb } = await import('@/lib/offline/db')
        const db = getOfflineDb()
        const count = await db.outbox
          .where('syncStatus')
          .equals('failed')
          .count()
        setFailedCount(count)
      } catch {
        // IndexedDB not available
      }
    }

    checkFailed()
    const interval = setInterval(checkFailed, 10000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted || failedCount === 0) return null

  return (
    <div className="bg-semantic-critical/10 border-b border-semantic-critical/30 px-md py-sm">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <FailedIcon className="w-4 h-4 text-semantic-critical" />
          <span className="text-meta text-semantic-critical">
            {failedCount} item{failedCount !== 1 ? 's' : ''} failed to sync
          </span>
        </div>
        <Link
          href="/settings/sync"
          className="text-meta text-semantic-critical underline hover:no-underline"
        >
          Review
        </Link>
      </div>
    </div>
  )
}

// ============================================================================
// CONFLICT BANNER
// ============================================================================

export function ConflictBanner() {
  const [conflictCount, setConflictCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    async function checkConflicts() {
      try {
        const { getOfflineDb } = await import('@/lib/offline/db')
        const db = getOfflineDb()
        const count = await db.conflicts
          .filter((c) => !c.resolvedAt)
          .count()
        setConflictCount(count)
      } catch {
        // IndexedDB not available
      }
    }

    checkConflicts()
    const interval = setInterval(checkConflicts, 10000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted || conflictCount === 0) return null

  return (
    <div className="bg-semantic-warning/10 border-b border-semantic-warning/30 px-md py-sm">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <ConflictIcon className="w-4 h-4 text-semantic-warning" />
          <span className="text-meta text-semantic-warning">
            {conflictCount} sync conflict{conflictCount !== 1 ? 's' : ''} need review
          </span>
        </div>
        <Link
          href="/settings/sync"
          className="text-meta text-semantic-warning underline hover:no-underline"
        >
          Resolve
        </Link>
      </div>
    </div>
  )
}

// ============================================================================
// ICONS
// ============================================================================

function OfflineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
      />
    </svg>
  )
}

function SyncingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  )
}

function FailedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function ConflictIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  )
}
