'use client'

import { useState } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { updateDocument, deleteDocument, type DocumentWithScopes } from '@/actions/document'
import { formatDate } from '@/lib/utils'
import type { Scope } from '@prisma/client'

interface DocumentListProps {
  documents: DocumentWithScopes[]
  canEdit: boolean
  scopes: Scope[]
}

const DOCUMENT_KINDS = [
  { value: 'LAB_REPORT', label: 'Lab report' },
  { value: 'CLINIC_LETTER', label: 'Clinic letter' },
  { value: 'GENETIC_REPORT', label: 'Genetic report' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'OTHER', label: 'Other' },
]

function kindLabel(kind: string): string {
  return DOCUMENT_KINDS.find((k) => k.value === kind)?.label || kind
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function DocumentList({ documents, canEdit, scopes }: DocumentListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('OTHER')
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])

  function startEdit(doc: DocumentWithScopes) {
    setEditingId(doc.id)
    setTitle(doc.title)
    setKind(doc.kind)
    setSelectedScopes(doc.scopes.map((s) => s.code))
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setTitle('')
    setKind('OTHER')
    setSelectedScopes([])
    setError('')
  }

  function toggleScope(code: string) {
    setSelectedScopes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  async function handleSave(docId: string) {
    if (selectedScopes.length === 0) {
      setError('At least one category is required')
      return
    }

    setSaving(true)
    setError('')

    const result = await updateDocument(docId, {
      title,
      kind,
      scopeCodes: selectedScopes,
    })

    if (!result.success) {
      setError(result.error || 'Failed to update')
    } else {
      setEditingId(null)
    }
    setSaving(false)
  }

  async function handleDelete(docId: string) {
    setSaving(true)
    setError('')

    const result = await deleteDocument(docId)

    if (!result.success) {
      setError(result.error || 'Failed to delete')
    }

    setDeletingId(null)
    setSaving(false)
  }

  if (documents.length === 0) {
    return <p className="text-text-secondary">No documents yet</p>
  }

  return (
    <ul className="divide-y divide-divider">
      {documents.map((doc) => {
        if (editingId === doc.id) {
          return (
            <li key={doc.id} className="py-md">
              <div className="space-y-sm">
                <Input
                  label="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
                <Select
                  label="Document type"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  options={DOCUMENT_KINDS}
                />
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
                  <Button
                    variant="secondary"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="h-auto py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleSave(doc.id)}
                    loading={saving}
                    className="h-auto py-2"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </li>
          )
        }

        if (deletingId === doc.id) {
          return (
            <li key={doc.id} className="py-md">
              <p className="text-body mb-sm">Delete "{doc.title}"?</p>
              <p className="text-meta text-text-secondary mb-md">
                This cannot be undone.
              </p>
              {error && <p className="text-caption text-semantic-critical mb-sm">{error}</p>}
              <div className="flex gap-sm">
                <Button
                  variant="secondary"
                  onClick={() => setDeletingId(null)}
                  disabled={saving}
                  className="h-auto py-2"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(doc.id)}
                  loading={saving}
                  className="h-auto py-2"
                >
                  Delete
                </Button>
              </div>
            </li>
          )
        }

        return (
          <li key={doc.id} className="py-md">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-sm">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-body font-medium text-accent-primary hover:underline"
                  >
                    {doc.title}
                  </a>
                  {doc.isCritical && (
                    <span className="px-sm py-0.5 text-caption bg-semantic-critical/10 text-semantic-critical rounded">
                      Critical
                    </span>
                  )}
                </div>
                <p className="text-meta text-text-secondary">
                  {kindLabel(doc.kind)} · {formatSize(doc.size)} · {formatDate(doc.uploadedAt)}
                </p>

                {/* Scope chips */}
                <div className="flex flex-wrap gap-xs mt-sm">
                  {doc.scopes.map((scope) => (
                    <span
                      key={scope.code}
                      className="px-sm py-0.5 text-caption bg-bg-primary rounded-sm text-text-secondary"
                    >
                      {scope.label}
                    </span>
                  ))}
                </div>

                {/* Preview for images */}
                {isImage(doc.mimeType) && (
                  <div className="mt-sm">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={doc.url}
                        alt={doc.title}
                        className="max-w-xs max-h-32 rounded-sm border border-divider"
                      />
                    </a>
                  </div>
                )}
              </div>

              {canEdit && (
                <div className="flex gap-sm ml-sm">
                  <Button
                    variant="text"
                    onClick={() => startEdit(doc)}
                    className="h-auto px-0 text-meta text-text-secondary"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => setDeletingId(doc.id)}
                    className="h-auto px-0 text-meta text-text-secondary"
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
