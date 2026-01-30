'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Textarea } from '@/components/ui'
import {
  createClinicalNote,
  deleteClinicalNote,
  updateNoteVisibility,
  type ClinicalNoteWithAuthor,
} from '@/actions/clinical-notes'
import { formatDate } from '@/lib/utils'

interface NoteFormProps {
  caseId: string
  eventId?: string
  onCreated?: () => void
}

export function ClinicalNoteForm({ caseId, eventId, onCreated }: NoteFormProps) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [shareWithParent, setShareWithParent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!text.trim()) return

    setSaving(true)
    setError('')

    const result = await createClinicalNote({
      caseId,
      eventId,
      text: text.trim(),
      visibility: shareWithParent ? 'SHARE_WITH_PARENT' : 'TEAM_ONLY',
    })

    if (!result.success) {
      setError(result.error || 'Failed to save note')
    } else {
      setText('')
      setShareWithParent(false)
      router.refresh()
      onCreated?.()
    }

    setSaving(false)
  }

  return (
    <div className="space-y-sm">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a clinical note..."
        rows={3}
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-xs text-meta text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={shareWithParent}
            onChange={(e) => setShareWithParent(e.target.checked)}
            className="rounded border-divider"
          />
          Share with parent
        </label>

        <Button onClick={handleSubmit} loading={saving} disabled={!text.trim()}>
          Add note
        </Button>
      </div>

      {error && <p className="text-caption text-semantic-critical">{error}</p>}
    </div>
  )
}

interface NoteCardProps {
  note: ClinicalNoteWithAuthor
  canEdit: boolean
  onDeleted?: () => void
}

export function ClinicalNoteCard({ note, canEdit, onDeleted }: NoteCardProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleToggleVisibility() {
    setSaving(true)
    setError('')

    const newVisibility = note.visibility === 'TEAM_ONLY' ? 'SHARE_WITH_PARENT' : 'TEAM_ONLY'
    const result = await updateNoteVisibility(note.id, newVisibility)

    if (!result.success) {
      setError(result.error || 'Failed to update')
    } else {
      router.refresh()
    }

    setSaving(false)
  }

  async function handleDelete() {
    setSaving(true)
    setError('')

    const result = await deleteClinicalNote(note.id)

    if (!result.success) {
      setError(result.error || 'Failed to delete')
      setSaving(false)
    } else {
      router.refresh()
      onDeleted?.()
    }
  }

  if (deleting) {
    return (
      <div className="p-sm bg-bg-primary rounded-sm">
        <p className="text-meta mb-sm">Delete this note?</p>
        {error && <p className="text-caption text-semantic-critical mb-sm">{error}</p>}
        <div className="flex gap-sm">
          <Button
            variant="secondary"
            onClick={() => setDeleting(false)}
            disabled={saving}
            className="h-auto py-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
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
    <div className="p-sm bg-bg-primary rounded-sm">
      <div className="flex items-start justify-between mb-xs">
        <div className="flex items-center gap-sm">
          <span className="text-meta font-medium">{note.author.name || 'Clinician'}</span>
          <span className="text-caption text-text-secondary">
            {formatDate(note.createdAt)}
          </span>
          {note.visibility === 'SHARE_WITH_PARENT' && (
            <span className="px-xs py-0.5 text-caption bg-accent-primary/10 text-accent-primary rounded">
              Shared
            </span>
          )}
        </div>

        {canEdit && (
          <div className="flex gap-xs">
            <button
              onClick={handleToggleVisibility}
              disabled={saving}
              className="text-caption text-text-secondary hover:text-text-primary disabled:opacity-50"
            >
              {note.visibility === 'TEAM_ONLY' ? 'Share' : 'Unshare'}
            </button>
            <button
              onClick={() => setDeleting(true)}
              className="text-caption text-text-secondary hover:text-semantic-critical"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <p className="text-meta text-text-primary whitespace-pre-wrap">{note.text}</p>
      {error && <p className="text-caption text-semantic-critical mt-xs">{error}</p>}
    </div>
  )
}

interface NotesListProps {
  notes: ClinicalNoteWithAuthor[]
  currentUserId: string
  onUpdate?: () => void
}

export function ClinicalNotesList({ notes, currentUserId, onUpdate }: NotesListProps) {
  if (notes.length === 0) {
    return (
      <p className="text-meta text-text-secondary italic">No clinical notes</p>
    )
  }

  return (
    <div className="space-y-sm">
      {notes.map((note) => (
        <ClinicalNoteCard
          key={note.id}
          note={note}
          canEdit={note.author.id === currentUserId}
          onDeleted={onUpdate}
        />
      ))}
    </div>
  )
}

// Parent-facing display of shared notes
interface SharedNotesProps {
  notes: ClinicalNoteWithAuthor[]
}

export function SharedClinicalNotes({ notes }: SharedNotesProps) {
  const sharedNotes = notes.filter((n) => n.visibility === 'SHARE_WITH_PARENT')

  if (sharedNotes.length === 0) return null

  return (
    <div className="mt-sm pt-sm border-t border-divider">
      <p className="text-caption text-text-secondary mb-xs">From the clinical team</p>
      <div className="space-y-sm">
        {sharedNotes.map((note) => (
          <div key={note.id} className="p-sm bg-accent-primary/5 rounded-sm">
            <p className="text-meta text-text-primary whitespace-pre-wrap">{note.text}</p>
            <p className="text-caption text-text-secondary mt-xs">
              {note.author.name} · {formatDate(note.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
