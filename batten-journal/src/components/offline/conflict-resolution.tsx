'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { resolveConflict, type ConflictRecord } from '@/lib/offline'
import { useOffline } from '@/lib/offline'

interface ConflictResolutionProps {
  conflict: ConflictRecord
  onResolved?: () => void
}

export function ConflictResolution({ conflict, onResolved }: ConflictResolutionProps) {
  const { refreshStatus } = useOffline()
  const [resolving, setResolving] = useState(false)
  const [showMerge, setShowMerge] = useState(false)
  const [mergeText, setMergeText] = useState('')

  const isEvent = conflict.entityType === 'event'
  const localData = conflict.localVersion as Record<string, unknown>
  const serverData = conflict.serverVersion as Record<string, unknown>

  // Get display text for comparison
  const localText = isEvent
    ? (localData.freeText as string) || '(no text)'
    : JSON.stringify(localData, null, 2)
  const serverText = isEvent
    ? (serverData.freeText as string) || '(no text)'
    : JSON.stringify(serverData, null, 2)

  async function handleResolve(resolution: 'local' | 'server' | 'merged') {
    setResolving(true)
    try {
      const merged = resolution === 'merged' ? { ...localData, freeText: mergeText } : undefined
      await resolveConflict(conflict.id, resolution, merged)
      await refreshStatus()
      onResolved?.()
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="p-md bg-white border border-semantic-warning/30 rounded-md">
      <div className="flex items-center gap-sm mb-md">
        <span className="w-2 h-2 rounded-full bg-semantic-warning" />
        <h3 className="text-body font-medium">
          {isEvent ? 'Event' : 'Profile'} needs review
        </h3>
      </div>

      <p className="text-meta text-text-secondary mb-md">
        This {isEvent ? 'entry' : 'profile'} was edited in two places. Choose which version to keep.
      </p>

      <div className="grid grid-cols-2 gap-sm mb-md">
        {/* Local version */}
        <div className="p-sm bg-bg-primary rounded-sm">
          <p className="text-caption text-text-secondary mb-xs">Your version</p>
          <p className="text-meta text-text-primary whitespace-pre-wrap">
            {localText}
          </p>
          <p className="text-caption text-text-secondary mt-xs">
            Edited {formatTime(conflict.localUpdatedAt)}
          </p>
        </div>

        {/* Server version */}
        <div className="p-sm bg-bg-primary rounded-sm">
          <p className="text-caption text-text-secondary mb-xs">Other version</p>
          <p className="text-meta text-text-primary whitespace-pre-wrap">
            {serverText}
          </p>
          <p className="text-caption text-text-secondary mt-xs">
            Edited {formatTime(conflict.serverUpdatedAt)}
          </p>
        </div>
      </div>

      {/* Merge option */}
      {showMerge && isEvent && (
        <div className="mb-md">
          <label className="block text-meta text-text-secondary mb-xs">
            Combined text
          </label>
          <textarea
            value={mergeText}
            onChange={(e) => setMergeText(e.target.value)}
            rows={3}
            className="w-full px-sm py-2 border border-divider rounded-sm text-body"
            placeholder="Write a combined version..."
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-sm">
        <Button
          onClick={() => handleResolve('local')}
          loading={resolving}
          className="h-auto py-2"
        >
          Keep mine
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleResolve('server')}
          loading={resolving}
          className="h-auto py-2"
        >
          Keep other
        </Button>
        {isEvent && !showMerge && (
          <Button
            variant="text"
            onClick={() => {
              setShowMerge(true)
              // Pre-fill with both versions
              setMergeText(`${localText}\n\n---\n\n${serverText}`)
            }}
            className="h-auto px-sm text-meta"
          >
            Merge both
          </Button>
        )}
        {showMerge && (
          <Button
            onClick={() => handleResolve('merged')}
            loading={resolving}
            disabled={!mergeText.trim()}
            className="h-auto py-2"
          >
            Save merged
          </Button>
        )}
      </div>
    </div>
  )
}

function formatTime(date: Date): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
