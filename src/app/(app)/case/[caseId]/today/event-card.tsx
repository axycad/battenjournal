'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Textarea, Input } from '@/components/ui'
import { updateEvent, deleteEvent, type EventWithScopes } from '@/actions/event'
import { EVENT_TYPES } from '@/lib/event-types'
import { deleteMediaItem } from '@/actions/document'
import {
  getNotesForEvent,
  type ClinicalNoteWithAuthor,
} from '@/actions/clinical-notes'
import { getFlagsForEvent, type FlagWithDetails } from '@/actions/flags'
import { getThreadForEvent } from '@/actions/messaging'
import {
  ClinicalNoteForm,
  ClinicalNotesList,
  SharedClinicalNotes,
} from '@/components/clinical/notes'
import { AddFlagButton, EventFlagsBadges } from '@/components/clinical/flags'
import { StartEventThreadButton } from '@/components/messaging'
import type { Scope } from '@prisma/client'

interface EventCardProps {
  event: EventWithScopes
  canEdit: boolean
  scopes: Scope[]
  caseId: string
  isClinician?: boolean
  currentUserId?: string
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function EventCard({
  event,
  canEdit,
  scopes,
  caseId,
  isClinician = false,
  currentUserId,
}: EventCardProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [addingPhoto, setAddingPhoto] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNoteWithAuthor[]>([])
  const [flags, setFlags] = useState<FlagWithDetails[]>([])
  const [threadInfo, setThreadInfo] = useState<{ threadId: string; messageCount: number } | null>(null)

  const [freeText, setFreeText] = useState(event.freeText || '')
  const [selectedScopes, setSelectedScopes] = useState<string[]>(
    event.scopes.map((s) => s.code)
  )
  const [backdateTime, setBackdateTime] = useState(
    event.occurredAt.toISOString().slice(0, 16)
  )

  const eventTypeConfig = EVENT_TYPES[event.eventType as keyof typeof EVENT_TYPES]
  const typeLabel = eventTypeConfig?.label || event.eventType

  // Load clinical notes, flags, and thread info
  useEffect(() => {
    async function loadClinicalData() {
      const [notes, eventFlags, thread] = await Promise.all([
        getNotesForEvent(caseId, event.id),
        isClinician ? getFlagsForEvent(caseId, event.id) : Promise.resolve([]),
        getThreadForEvent(caseId, event.id),
      ])
      setClinicalNotes(notes)
      setFlags(eventFlags)
      setThreadInfo(thread)
    }
    loadClinicalData()
  }, [caseId, event.id, isClinician])

  async function handleRefreshClinicalData() {
    const [notes, eventFlags] = await Promise.all([
      getNotesForEvent(caseId, event.id),
      isClinician ? getFlagsForEvent(caseId, event.id) : Promise.resolve([]),
    ])
    setClinicalNotes(notes)
    setFlags(eventFlags)
  }

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
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif']
    if (!validTypes.includes(file.type)) {
      setError('Only images (JPG, PNG, HEIC) are allowed')
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('This file is larger than 25MB')
      return
    }

    setSaving(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('caseId', caseId)
      formData.append('eventId', event.id)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Upload failed')
      } else {
        setAddingPhoto(false)
        router.refresh()
      }
    } catch {
      setError('Upload failed')
    } finally {
      setSaving(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleDeleteMedia(mediaId: string) {
    setSaving(true)
    setError('')

    const result = await deleteMediaItem(mediaId)

    if (!result.success) {
      setError(result.error || 'Failed to delete')
    }
    setSaving(false)
  }

  function handleCancel() {
    setFreeText(event.freeText || '')
    setSelectedScopes(event.scopes.map((s) => s.code))
    setBackdateTime(event.occurredAt.toISOString().slice(0, 16))
    setEditing(false)
    setDeleting(false)
    setAddingPhoto(false)
    setAddingNote(false)
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
      <div id={`event-${event.id}`} className="p-md bg-white border border-divider rounded-md">
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
      <div id={`event-${event.id}`} className="p-md bg-white border border-divider rounded-md">
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
    <div id={`event-${event.id}`} className="p-md bg-white border border-divider rounded-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header: type + time + flags */}
          <div className="flex items-center gap-sm mb-xs flex-wrap">
            <span className="text-body font-medium">{typeLabel}</span>
            <span className="text-meta text-text-secondary">
              {formatTime(event.occurredAt)}
            </span>
            {event.isBackdated && (
              <span className="text-caption text-text-secondary italic">
                (logged later)
              </span>
            )}
            {/* Flags for clinicians */}
            {isClinician && flags.length > 0 && (
              <EventFlagsBadges flags={flags} onUpdate={handleRefreshClinicalData} />
            )}
          </div>

          {/* Free text */}
          {event.freeText && (
            <p className="text-body text-text-primary mb-sm whitespace-pre-wrap">
              {event.freeText}
            </p>
          )}

          {/* Media items */}
          {event.mediaItems.length > 0 && (
            <div className="flex flex-wrap gap-sm mb-sm">
              {event.mediaItems.map((media) => (
                <div key={media.id} className="relative group">
                  <a href={media.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={media.url}
                      alt="Event photo"
                      className="max-w-32 max-h-24 rounded-sm border border-divider"
                    />
                  </a>
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteMedia(media.id)}
                      disabled={saving}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-white border border-divider rounded-full
                        flex items-center justify-center text-text-secondary hover:text-semantic-critical
                        opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove photo"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
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

          {/* Partial visibility indicator */}
          {event.isPartiallyHidden && (
            <p className="text-caption text-text-secondary italic mt-sm">
              Some details not shared with you
            </p>
          )}

          {/* Author */}
          {event.author.name && (
            <p className="text-caption text-text-secondary mt-sm">
              by {event.author.name}
            </p>
          )}

          {/* Discussion thread link */}
          {threadInfo ? (
            <div className="mt-sm">
              <Link
                href={`/case/${caseId}/messages/${threadInfo.threadId}`}
                className="text-meta text-accent-primary hover:underline"
              >
                Discussion ({threadInfo.messageCount} message{threadInfo.messageCount !== 1 ? 's' : ''})
              </Link>
            </div>
          ) : (
            <div className="mt-sm">
              <StartEventThreadButton
                caseId={caseId}
                eventId={event.id}
                eventTitle={typeLabel}
                currentUserId={currentUserId || ''}
              />
            </div>
          )}

          {/* Shared clinical notes for parents */}
          {!isClinician && clinicalNotes.length > 0 && (
            <SharedClinicalNotes notes={clinicalNotes} />
          )}

          {/* Clinical notes section for clinicians */}
          {isClinician && (
            <div className="mt-sm pt-sm border-t border-divider">
              {clinicalNotes.length > 0 && (
                <div className="mb-sm">
                  <ClinicalNotesList
                    notes={clinicalNotes}
                    currentUserId={currentUserId || ''}
                    onUpdate={handleRefreshClinicalData}
                  />
                </div>
              )}

              {addingNote ? (
                <div className="mt-sm">
                  <ClinicalNoteForm
                    caseId={caseId}
                    eventId={event.id}
                    onCreated={() => {
                      setAddingNote(false)
                      handleRefreshClinicalData()
                    }}
                  />
                  <button
                    onClick={() => setAddingNote(false)}
                    className="mt-xs text-caption text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingNote(true)}
                  className="text-meta text-accent-primary hover:underline"
                >
                  + Add clinical note
                </button>
              )}
            </div>
          )}

          {/* Add photo inline */}
          {canEdit && addingPhoto && (
            <div className="mt-sm pt-sm border-t border-divider">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/heic,image/heif"
                onChange={handlePhotoUpload}
                disabled={saving}
                className="block w-full text-body text-text-primary
                  file:mr-sm file:py-1 file:px-sm
                  file:rounded-sm file:border-0
                  file:text-meta file:font-medium
                  file:bg-accent-primary/10 file:text-accent-primary"
              />
              {error && <p className="text-caption text-semantic-critical mt-xs">{error}</p>}
              <Button
                variant="text"
                onClick={() => setAddingPhoto(false)}
                className="mt-xs h-auto px-0 text-meta"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Actions column */}
        <div className="flex flex-col gap-xs ml-sm">
          {/* Parent actions */}
          {canEdit && (
            <>
              <Button
                variant="text"
                onClick={() => setEditing(true)}
                className="h-auto px-0 text-meta text-text-secondary"
              >
                Edit
              </Button>
              {!addingPhoto && (
                <Button
                  variant="text"
                  onClick={() => setAddingPhoto(true)}
                  className="h-auto px-0 text-meta text-text-secondary"
                >
                  Add photo
                </Button>
              )}
              <Button
                variant="text"
                onClick={() => setDeleting(true)}
                className="h-auto px-0 text-meta text-text-secondary"
              >
                Delete
              </Button>
            </>
          )}

          {/* Clinician actions */}
          {isClinician && (
            <AddFlagButton
              caseId={caseId}
              anchorType="event"
              anchorId={event.id}
              onCreated={handleRefreshClinicalData}
            />
          )}
        </div>
      </div>
    </div>
  )
}
