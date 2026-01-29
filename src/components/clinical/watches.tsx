'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {Link} from '@/navigation'
import { createWatchAPI, removeWatchAPI, type WatchWithScope, type WatchedUpdate } from '@/lib/api/clinical'
import { formatDate } from '@/lib/utils'

interface WatchManagerProps {
  caseId: string
  watches: WatchWithScope[]
  availableScopes: { id: string; code: string; label: string }[]
  onUpdate?: () => void
}

export function WatchManager({
  caseId,
  watches,
  availableScopes,
  onUpdate,
}: WatchManagerProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const watchedScopeIds = new Set(watches.map((w) => w.scope.id))
  const unwatchedScopes = availableScopes.filter((s) => !watchedScopeIds.has(s.id))

  async function handleWatch(scopeId: string) {
    setSaving(true)
    await createWatchAPI(caseId, scopeId)
    setSaving(false)
    router.refresh()
    onUpdate?.()
  }

  async function handleUnwatch(watchId: string) {
    setSaving(true)
    await removeWatchAPI(watchId)
    setSaving(false)
    router.refresh()
    onUpdate?.()
  }

  return (
    <div className="space-y-md">
      {/* Currently watching */}
      <div>
        <h3 className="text-meta text-text-secondary mb-sm">Watching</h3>
        {watches.length === 0 ? (
          <p className="text-meta text-text-secondary italic">
            Not watching any categories
          </p>
        ) : (
          <div className="flex flex-wrap gap-xs">
            {watches.map((watch) => (
              <div
                key={watch.id}
                className="flex items-center gap-xs px-sm py-1 bg-accent-primary/10 text-accent-primary rounded-sm"
              >
                <span className="text-meta">{watch.scope.label}</span>
                <button
                  onClick={() => handleUnwatch(watch.id)}
                  disabled={saving}
                  className="text-caption hover:text-semantic-critical disabled:opacity-50"
                  title="Stop watching"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available to watch */}
      {unwatchedScopes.length > 0 && (
        <div>
          <h3 className="text-meta text-text-secondary mb-sm">Available to watch</h3>
          <div className="flex flex-wrap gap-xs">
            {unwatchedScopes.map((scope) => (
              <button
                key={scope.id}
                onClick={() => handleWatch(scope.id)}
                disabled={saving}
                className="px-sm py-1 text-meta border border-divider rounded-sm
                  hover:border-accent-primary hover:text-accent-primary
                  disabled:opacity-50 transition-colors"
              >
                + {scope.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface WatchedUpdatesListProps {
  updates: WatchedUpdate[]
  caseId: string
}

export function WatchedUpdatesList({ updates, caseId }: WatchedUpdatesListProps) {
  if (updates.length === 0) {
    return (
      <p className="text-meta text-text-secondary italic">
        No recent updates in watched categories
      </p>
    )
  }

  return (
    <div className="space-y-md">
      {updates.map((group) => (
        <div key={group.scope.code}>
          <h4 className="text-meta font-medium mb-sm">{group.scope.label}</h4>
          <div className="space-y-xs">
            {group.events.map((event) => (
              <Link
                key={event.id}
                href={`/case/${caseId}/today#event-${event.id}`}
                className="block p-sm bg-bg-primary rounded-sm hover:bg-accent-primary/5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-meta text-text-primary">
                    {event.eventType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-caption text-text-secondary">
                    {formatDate(event.occurredAt)}
                  </span>
                </div>
                {event.freeText && (
                  <p className="text-caption text-text-secondary mt-xs line-clamp-2">
                    {event.freeText}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
