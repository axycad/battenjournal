'use client'

import { useState } from 'react'
import { Button, Input, Textarea } from '@/components/ui'
import { addCondition, updateCondition, deleteCondition } from '@/actions/profile'
import type { Condition } from '@prisma/client'

interface ConditionsSectionProps {
  caseId: string
  conditions: Condition[]
  canEdit: boolean
}

export function ConditionsSection({
  caseId,
  conditions,
  canEdit,
}: ConditionsSectionProps) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')

  function resetForm() {
    setName('')
    setNotes('')
    setError('')
  }

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    setError('')

    const result = await addCondition(caseId, {
      name: name.trim(),
      notes: notes.trim() || undefined,
    })

    if (!result.success) {
      setError(result.error || 'Failed to add')
    } else {
      setAdding(false)
      resetForm()
    }
    setSaving(false)
  }

  async function handleUpdate(id: string) {
    if (!name.trim()) return
    setSaving(true)
    setError('')

    const result = await updateCondition(id, {
      name: name.trim(),
      notes: notes.trim() || undefined,
    })

    if (!result.success) {
      setError(result.error || 'Failed to update')
    } else {
      setEditingId(null)
      resetForm()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setSaving(true)
    const result = await deleteCondition(id)
    if (!result.success) {
      setError(result.error || 'Failed to delete')
    }
    setDeletingId(null)
    setSaving(false)
  }

  function startEdit(condition: Condition) {
    setEditingId(condition.id)
    setName(condition.name)
    setNotes(condition.notes || '')
  }

  function cancelEdit() {
    setEditingId(null)
    resetForm()
  }

  return (
    <section className="p-md bg-white border border-divider rounded-md">
      <div className="flex items-center justify-between mb-md">
        <h2 className="section-header">Conditions</h2>
        {canEdit && !adding && (
          <Button
            variant="text"
            onClick={() => setAdding(true)}
            className="h-auto px-0"
          >
            Add
          </Button>
        )}
      </div>

      {conditions.length === 0 && !adding && (
        <p className="text-text-secondary">No conditions recorded</p>
      )}

      <ul className="divide-y divide-divider">
        {conditions.map((condition) => {
          if (editingId === condition.id) {
            return (
              <li key={condition.id} className="py-sm">
                <div className="space-y-sm">
                  <Input
                    label="Condition"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                  <Textarea
                    label="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                  {error && <p className="text-caption text-semantic-critical">{error}</p>}
                  <div className="flex gap-sm">
                    <Button
                      variant="secondary"
                      onClick={cancelEdit}
                      disabled={saving}
                      className="h-auto py-1 px-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleUpdate(condition.id)}
                      loading={saving}
                      className="h-auto py-1 px-sm"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </li>
            )
          }

          if (deletingId === condition.id) {
            return (
              <li key={condition.id} className="py-sm">
                <p className="text-body mb-sm">
                  Remove {condition.name}?
                </p>
                <div className="flex gap-sm">
                  <Button
                    variant="secondary"
                    onClick={() => setDeletingId(null)}
                    disabled={saving}
                    className="h-auto py-1 px-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(condition.id)}
                    loading={saving}
                    className="h-auto py-1 px-sm"
                  >
                    Remove
                  </Button>
                </div>
              </li>
            )
          }

          return (
            <li key={condition.id} className="py-sm flex items-start justify-between">
              <div>
                <p className="text-body">{condition.name}</p>
                {condition.notes && (
                  <p className="text-meta text-text-secondary">{condition.notes}</p>
                )}
              </div>
              {canEdit && (
                <div className="flex gap-sm">
                  <Button
                    variant="text"
                    onClick={() => startEdit(condition)}
                    className="h-auto px-0 text-meta"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => setDeletingId(condition.id)}
                    className="h-auto px-0 text-meta text-text-secondary"
                  >
                    Remove
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {adding && (
        <div className="mt-sm pt-sm border-t border-divider space-y-sm">
          <Input
            label="Condition"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., CLN2 Batten Disease"
            autoFocus
          />
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details"
            rows={2}
          />
          {error && <p className="text-caption text-semantic-critical">{error}</p>}
          <div className="flex gap-sm">
            <Button
              variant="secondary"
              onClick={() => {
                setAdding(false)
                resetForm()
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleAdd} loading={saving}>
              Add condition
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
