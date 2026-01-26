'use client'

import { useState } from 'react'
import { Button, Textarea } from '@/components/ui'
import { resolveConflict, type ConflictRecord } from '@/lib/offline/sync'
import { useOffline } from '@/lib/offline/context'

interface ConflictResolutionProps {
  conflict: ConflictRecord
  onResolved: () => void
}

export function ConflictResolution({ conflict, onResolved }: ConflictResolutionProps) {
  const { refreshStatus } = useOffline()
  const [resolution, setResolution] = useState<'local' | 'server' | 'merged' | null>(null)
  const [mergedText, setMergedText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEvent = conflict.entityType === 'event'
  const localText = isEvent
    ? (conflict.localVersion.freeText as string) || ''
    : (conflict.localVersion.emergencyNotes as string) || ''
  const serverText = isEvent
    ? (conflict.serverVersion.freeText as string) || ''
    : (conflict.serverVersion.emergencyNotes as string) || ''

  function selectResolution(r: 'local' | 'server' | 'merged') {
    setResolution(r)
    if (r === 'merged') {
      // Pre-fill with combination
      setMergedText(`${localText}\n\n---\n\n${serverText}`)
    }
  }

  async function handleResolve() {
    if (!resolution) return

    setSaving(true)
    setError('')

    try {
      let mergedData: Record<string, unknown> | undefined

      if (resolution === 'merged') {
        if (isEvent) {
          mergedData = {
            ...conflict.localVersion,
            freeText: mergedText,
          }
        } else {
        mergedData = {
          ...conflict.localVersion,
          emergencyNotes: mergedText,
        }
        }
      }

      await resolveConflict(conflict.id, resolution, mergedData)
      await refreshStatus()
      onResolved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resolve')
    } finally {
      setSaving(false)
    }
  }

  function formatTimestamp(date: Date): string {
    return new Date(date).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="p-md bg-white border border-semantic-warning/30 rounded-md">
      <div className="flex items-start justify-between mb-md">
        <div>
          <h3 className="text-body font-medium">
            {isEvent ? 'Event' : 'Profile'} conflict
          </h3>
          <p className="text-meta text-text-secondary">
            Changes were made on multiple devices. Choose which to keep.
          </p>
        </div>
        <span className="px-sm py-0.5 text-caption bg-semantic-warning/10 text-semantic-warning rounded">
          Needs review
        </span>
      </div>

      <div className="grid grid-cols-2 gap-sm mb-md">
        {/* Local version */}
        <button
          onClick={() => selectResolution('local')}
          className={`p-sm text-left border rounded-sm transition-colors ${
            resolution === 'local'
              ? 'border-accent-primary bg-accent-primary/5'
              : 'border-divider hover:border-accent-primary'
          }`}
        >
          <p className="text-meta font-medium mb-xs">This device</p>
          <p className="text-caption text-text-secondary mb-sm">
            {formatTimestamp(conflict.localUpdatedAt)}
          </p>
          <div className="text-meta bg-bg-primary p-sm rounded-sm max-h-24 overflow-auto">
            {localText || <span className="text-text-secondary italic">Empty</span>}
          </div>
        </button>

        {/* Server version */}
        <button
          onClick={() => selectResolution('server')}
          className={`p-sm text-left border rounded-sm transition-colors ${
            resolution === 'server'
              ? 'border-accent-primary bg-accent-primary/5'
              : 'border-divider hover:border-accent-primary'
          }`}
        >
          <p className="text-meta font-medium mb-xs">Other device</p>
          <p className="text-caption text-text-secondary mb-sm">
            {formatTimestamp(conflict.serverUpdatedAt)}
          </p>
          <div className="text-meta bg-bg-primary p-sm rounded-sm max-h-24 overflow-auto">
            {serverText || <span className="text-text-secondary italic">Empty</span>}
          </div>
        </button>
      </div>

      {/* Merge option */}
      <button
        onClick={() => selectResolution('merged')}
        className={`w-full p-sm text-left border rounded-sm transition-colors mb-md ${
          resolution === 'merged'
            ? 'border-accent-primary bg-accent-primary/5'
            : 'border-divider hover:border-accent-primary'
        }`}
      >
        <p className="text-meta font-medium">Merge both</p>
        <p className="text-caption text-text-secondary">
          Combine the changes manually
        </p>
      </button>

      {/* Merge editor */}
      {resolution === 'merged' && (
        <div className="mb-md">
          <Textarea
            value={mergedText}
            onChange={(e) => setMergedText(e.target.value)}
            rows={4}
            placeholder="Edit the combined text..."
          />
        </div>
      )}

      {error && (
        <p className="text-caption text-semantic-critical mb-sm">{error}</p>
      )}

      <div className="flex gap-sm">
        <Button
          onClick={handleResolve}
          disabled={!resolution}
          loading={saving}
        >
          {resolution === 'local'
            ? 'Keep this device'
            : resolution === 'server'
            ? 'Keep other device'
            : resolution === 'merged'
            ? 'Save merged'
            : 'Select an option'}
        </Button>
      </div>
    </div>
  )
}

// List of all conflicts
interface ConflictListProps {
  conflicts: ConflictRecord[]
  onResolved: () => void
}

export function ConflictList({ conflicts, onResolved }: ConflictListProps) {
  if (conflicts.length === 0) {
    return (
      <div className="p-md text-center text-text-secondary">
        <p>No conflicts to resolve</p>
      </div>
    )
  }

  return (
    <div className="space-y-md">
      {conflicts.map((conflict) => (
        <ConflictResolution
          key={conflict.id}
          conflict={conflict}
          onResolved={onResolved}
        />
      ))}
    </div>
  )
}
