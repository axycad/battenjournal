'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import {
  createFlag,
  resolveFlag,
  reopenFlag,
  deleteFlag,
  type FlagLabel,
  type FlagWithDetails,
} from '@/lib/api/clinical'
import { formatDate } from '@/lib/utils'

const FLAG_OPTIONS: { value: FlagLabel; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: 'bg-semantic-critical/10 text-semantic-critical' },
  { value: 'follow_up', label: 'Follow-up', color: 'bg-semantic-warning/10 text-semantic-warning' },
]

interface FlagButtonProps {
  caseId: string
  anchorType: 'event' | 'case'
  anchorId: string
  onCreated?: () => void
}

export function AddFlagButton({ caseId, anchorType, anchorId, onCreated }: FlagButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleCreate(label: FlagLabel) {
    setSaving(true)

    const result = await createFlag({
      caseId,
      anchorType,
      anchorId,
      label,
    })

    if (result.success) {
      setOpen(false)
      router.refresh()
      onCreated?.()
    }

    setSaving(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-caption text-text-secondary hover:text-text-primary"
      >
        + Flag
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-divider rounded-sm shadow-lg min-w-32">
            {FLAG_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleCreate(opt.value)}
                disabled={saving}
                className="w-full px-sm py-2 text-left text-meta hover:bg-bg-primary disabled:opacity-50"
              >
                <span className={`px-xs py-0.5 rounded text-caption ${opt.color}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface FlagBadgeProps {
  flag: FlagWithDetails
  onUpdate?: () => void
}

export function FlagBadge({ flag, onUpdate }: FlagBadgeProps) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [saving, setSaving] = useState(false)

  const config = FLAG_OPTIONS.find((f) => f.value === flag.label) || {
    label: flag.label,
    color: 'bg-bg-primary text-text-secondary',
  }

  async function handleResolve() {
    setSaving(true)
    await resolveFlag(flag.id)
    setShowMenu(false)
    setSaving(false)
    router.refresh()
    onUpdate?.()
  }

  async function handleReopen() {
    setSaving(true)
    await reopenFlag(flag.id)
    setShowMenu(false)
    setSaving(false)
    router.refresh()
    onUpdate?.()
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`px-sm py-0.5 rounded text-caption ${config.color} ${
          flag.status === 'RESOLVED' ? 'opacity-50 line-through' : ''
        }`}
      >
        {config.label}
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-divider rounded-sm shadow-lg min-w-24">
            {flag.status === 'OPEN' ? (
              <button
                onClick={handleResolve}
                disabled={saving}
                className="w-full px-sm py-2 text-left text-meta hover:bg-bg-primary disabled:opacity-50"
              >
                Resolve
              </button>
            ) : (
              <button
                onClick={handleReopen}
                disabled={saving}
                className="w-full px-sm py-2 text-left text-meta hover:bg-bg-primary disabled:opacity-50"
              >
                Reopen
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

interface FlagsListProps {
  flags: FlagWithDetails[]
  currentUserId: string
  showResolved?: boolean
  onUpdate?: () => void
}

export function FlagsList({ flags, currentUserId, showResolved = false, onUpdate }: FlagsListProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const visibleFlags = showResolved ? flags : flags.filter((f) => f.status === 'OPEN')

  if (visibleFlags.length === 0) {
    return <p className="text-meta text-text-secondary italic">No flags</p>
  }

  async function handleDelete(flagId: string) {
    setSaving(true)
    await deleteFlag(flagId)
    setDeleting(null)
    setSaving(false)
    router.refresh()
    onUpdate?.()
  }

  async function handleResolve(flagId: string) {
    await resolveFlag(flagId)
    router.refresh()
    onUpdate?.()
  }

  async function handleReopen(flagId: string) {
    await reopenFlag(flagId)
    router.refresh()
    onUpdate?.()
  }

  return (
    <div className="space-y-sm">
      {visibleFlags.map((flag) => {
        const config = FLAG_OPTIONS.find((f) => f.value === flag.label) || {
          label: flag.label,
          color: 'bg-bg-primary text-text-secondary',
        }

        if (deleting === flag.id) {
          return (
            <div key={flag.id} className="p-sm bg-bg-primary rounded-sm">
              <p className="text-meta mb-sm">Delete this flag?</p>
              <div className="flex gap-sm">
                <Button
                  variant="secondary"
                  onClick={() => setDeleting(null)}
                  disabled={saving}
                  className="h-auto py-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(flag.id)}
                  loading={saving}
                  className="h-auto py-1"
                >
                  Delete
                </Button>
              </div>
            </div>
          )
        }

        return (
          <div
            key={flag.id}
            className="flex items-center justify-between p-sm bg-bg-primary rounded-sm"
          >
            <div className="flex items-center gap-sm">
              <span
                className={`px-sm py-0.5 rounded text-caption ${config.color} ${
                  flag.status === 'RESOLVED' ? 'opacity-50 line-through' : ''
                }`}
              >
                {config.label}
              </span>
              <span className="text-caption text-text-secondary">
                by {flag.createdBy.name} · {formatDate(flag.createdAt)}
              </span>
              {flag.status === 'RESOLVED' && flag.resolvedAt && (
                <span className="text-caption text-semantic-success">
                  Resolved {formatDate(flag.resolvedAt)}
                </span>
              )}
            </div>

            <div className="flex gap-xs">
              {flag.status === 'OPEN' ? (
                <button
                  onClick={() => handleResolve(flag.id)}
                  className="text-caption text-text-secondary hover:text-semantic-success"
                >
                  Resolve
                </button>
              ) : (
                <button
                  onClick={() => handleReopen(flag.id)}
                  className="text-caption text-text-secondary hover:text-text-primary"
                >
                  Reopen
                </button>
              )}
              {flag.createdBy.id === currentUserId && (
                <button
                  onClick={() => setDeleting(flag.id)}
                  className="text-caption text-text-secondary hover:text-semantic-critical"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Inline display for event cards
interface EventFlagsProps {
  flags: FlagWithDetails[]
  onUpdate?: () => void
}

export function EventFlagsBadges({ flags, onUpdate }: EventFlagsProps) {
  const openFlags = flags.filter((f) => f.status === 'OPEN')

  if (openFlags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-xs">
      {openFlags.map((flag) => (
        <FlagBadge key={flag.id} flag={flag} onUpdate={onUpdate} />
      ))}
    </div>
  )
}
