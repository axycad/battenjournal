'use client'

import { useState } from 'react'
import { Button, Textarea, Input } from '@/components/ui'
import { updateEvent, deleteEvent, EVENT_TYPES, type EventWithScopes } from '@/actions/event'
import type { Scope } from '@prisma/client'

interface EventCardProps {
  event: EventWithScopes
  canEdit: boolean
  scopes: Scope[]
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function EventCard({ event, canEdit, scopes }: EventCardProps) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [freeText, setFreeText] = useState(event.freeText || '')
  const [selectedScopes, setSelectedScopes] = useState<string[]>(
    event.scopes.map((s) => s.code)
  )
  const [backdateTime, setBackdateTime] = useState(
    event.occurredAt.toISOString().slice(0, 16)
  )

  const eventTypeConfig = EVENT_TYPES[event.eventType as keyof typeof EVENT_TYPES]
  const typeLabel = eventTypeConfig?.label || event.eventType

  async function handleSave() {
    setSaving(true)
    setError('')

    const result = await updateEvent(event.id, {
      freeText: freeText.trim() || undefined,
      occurredAt: backdateTime,
      scopeCodes: selectedScopes,
    })

    if (!result.success) {
      setError(result.error || 'Failed to save')
    } else {
      setEditing(false)
    }
    setSaving(false)
  }

  async function handleDelete() {
    setSaving(true)
    setError('')

    const result = await deleteEvent(event.id)

    if (!result.success) {
      setError(result.error || 'Failed to delete')
      setSaving(false)
    }
    // Component will be removed after revalidation
  }

  function handleCancel() {
    setFreeText(event.freeText || '')
    setSelectedScopes(event.scopes.map((s) => s.code))
    setBackdateTime(event.occurredAt.toISOString().slice(0, 16))
    setEditing(false)
    setDeleting(false)
    setError('')
  }

  function toggleScope(code: string) {
    setSelectedScopes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  // Delete confirmation
  if (deleting) {
    return (
      <div className="p-md bg-white border border-divider rounded-md">
        <p className="text-body mb-sm">Delete this entry?</p>
        <p className="text-meta text-text-secondary mb-md">
          {typeLabel}
          {event.freeText && `: "${event.freeText.slice(0, 50)}..."`}
        </p>
        {error && <p className="text-caption text-semantic-critical mb-sm">{error}</p>}
        <div className="flex gap-sm">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={saving}
            className="h-auto py-2"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={saving}
            className="h-auto py-2"
          >
            Delete
          </Button>
        </div>
      </div>
    )
  }

  // Edit mode
  if (editing) {
    return (
      <div className="p-md bg-white border border-divider rounded-md">
        <div className="flex items-center justify-between mb-sm">
          <h3 className="text-body font-medium">{typeLabel}</h3>
          <Button
            variant="text"
            onClick={handleCancel}
            className="h-auto px-0 text-meta"
          >
            Cancel
          </Button>
        </div>

        <div className="space-y-sm">
          <Textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="What happened?"
            rows={2}
          />

          <div>
            <label className="block text-meta text-text-secondary mb-xs">
              When
            </label>
            <Input
              type="datetime-local"
              value={backdateTime}
              onChange={(e) => setBackdateTime(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-meta text-text-secondary mb-xs">
              Categories
            </label>
            <div className="flex flex-wrap gap-xs">
              {scopes.map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => toggleScope(scope.code)}
                  className={`px-sm py-1 text-meta rounded-sm border transition-colors ${
                    selectedScopes.includes(scope.code)
                      ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                      : 'border-divider text-text-secondary hover:border-accent-primary'
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-caption text-semantic-critical">{error}</p>}

          <div className="flex gap-sm">
            <Button onClick={handleSave} loading={saving}>
              Save
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Display mode
  return (
    <div className="p-md bg-white border border-divider rounded-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header: type + time */}
          <div className="flex items-center gap-sm mb-xs">
            <span className="text-body font-medium">{typeLabel}</span>
            <span className="text-meta text-text-secondary">
              {formatTime(event.occurredAt)}
            </span>
            {event.isBackdated && (
              <span className="text-caption text-text-secondary italic">
                (logged later)
              </span>
            )}
          </div>

          {/* Free text */}
          {event.freeText && (
            <p className="text-body text-text-primary mb-sm whitespace-pre-wrap">
              {event.freeText}
            </p>
          )}

          {/* Scope tags */}
          {event.scopes.length > 0 && (
            <div className="flex flex-wrap gap-xs">
              {event.scopes.map((scope) => (
                <span
                  key={scope.code}
                  className="px-sm py-1 text-caption bg-bg-primary rounded-sm text-text-secondary"
                >
                  {scope.label}
                </span>
              ))}
            </div>
          )}

          {/* Author (if not obvious) */}
          {event.author.name && (
            <p className="text-caption text-text-secondary mt-sm">
              by {event.author.name}
            </p>
          )}
        </div>

        {/* Edit/delete actions */}
        {canEdit && (
          <div className="flex gap-sm ml-sm">
            <Button
              variant="text"
              onClick={() => setEditing(true)}
              className="h-auto px-0 text-meta text-text-secondary"
            >
              Edit
            </Button>
            <Button
              variant="text"
              onClick={() => setDeleting(true)}
              className="h-auto px-0 text-meta text-text-secondary"
            >
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
