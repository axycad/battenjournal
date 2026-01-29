'use client'

import { useState } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { addAllergyAPI, updateAllergyAPI, deleteAllergyAPI } from '@/lib/api/profile'
import type { Allergy, AllergySeverity } from '@prisma/client'

interface AllergiesSectionProps {
  caseId: string
  allergies: Allergy[]
  canEdit: boolean
}

const SEVERITY_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'MILD', label: 'Mild' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'SEVERE', label: 'Severe' },
  { value: 'LIFE_THREATENING', label: 'Life-threatening' },
]

function severityLabel(severity: AllergySeverity | null): string {
  if (!severity) return ''
  return severity.toLowerCase().replace(/_/g, '-')
}

function severityClass(severity: AllergySeverity | null): string {
  if (severity === 'LIFE_THREATENING' || severity === 'SEVERE') {
    return 'text-semantic-critical font-medium'
  }
  return ''
}

export function AllergiesSection({
  caseId,
  allergies,
  canEdit,
}: AllergiesSectionProps) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [substance, setSubstance] = useState('')
  const [reaction, setReaction] = useState('')
  const [severity, setSeverity] = useState<AllergySeverity | ''>('')

  function resetForm() {
    setSubstance('')
    setReaction('')
    setSeverity('')
    setError('')
  }

  async function handleAdd() {
    if (!substance.trim()) return
    setSaving(true)
    setError('')

    const result = await addAllergyAPI(caseId, {
      substance: substance.trim(),
      reaction: reaction.trim() || undefined,
      severity: severity || undefined,
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
    if (!substance.trim()) return
    setSaving(true)
    setError('')

    const result = await updateAllergyAPI(id, {
      substance: substance.trim(),
      reaction: reaction.trim() || undefined,
      severity: severity || undefined,
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
    const result = await deleteAllergyAPI(id)
    if (!result.success) {
      setError(result.error || 'Failed to delete')
    }
    setDeletingId(null)
    setSaving(false)
  }

  function startEdit(allergy: Allergy) {
    setEditingId(allergy.id)
    setSubstance(allergy.substance)
    setReaction(allergy.reaction || '')
    setSeverity(allergy.severity || '')
  }

  function cancelEdit() {
    setEditingId(null)
    resetForm()
  }

  return (
    <section className="p-md bg-white border border-divider rounded-md">
      <div className="flex items-center justify-between mb-md">
        <h2 className="section-header">Allergies</h2>
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

      {allergies.length === 0 && !adding && (
        <p className="text-text-secondary">No allergies recorded</p>
      )}

      <ul className="divide-y divide-divider">
        {allergies.map((allergy) => {
          if (editingId === allergy.id) {
            return (
              <li key={allergy.id} className="py-sm">
                <div className="space-y-sm">
                  <Input
                    label="Substance"
                    value={substance}
                    onChange={(e) => setSubstance(e.target.value)}
                    autoFocus
                  />
                  <Input
                    label="Reaction"
                    value={reaction}
                    onChange={(e) => setReaction(e.target.value)}
                    placeholder="e.g., hives, anaphylaxis"
                  />
                  <Select
                    label="Severity"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as AllergySeverity | '')}
                    options={SEVERITY_OPTIONS}
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
                      onClick={() => handleUpdate(allergy.id)}
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

          if (deletingId === allergy.id) {
            return (
              <li key={allergy.id} className="py-sm">
                <p className="text-body mb-sm">
                  Remove {allergy.substance} from allergies?
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
                    onClick={() => handleDelete(allergy.id)}
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
            <li key={allergy.id} className="py-sm flex items-start justify-between">
              <div>
                <p className={severityClass(allergy.severity)}>
                  {allergy.substance}
                  {allergy.severity && (
                    <span className="text-meta ml-2">
                      ({severityLabel(allergy.severity)})
                    </span>
                  )}
                </p>
                {allergy.reaction && (
                  <p className="text-meta text-text-secondary">{allergy.reaction}</p>
                )}
              </div>
              {canEdit && (
                <div className="flex gap-sm">
                  <Button
                    variant="text"
                    onClick={() => startEdit(allergy)}
                    className="h-auto px-0 text-meta"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => setDeletingId(allergy.id)}
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
            label="Substance"
            value={substance}
            onChange={(e) => setSubstance(e.target.value)}
            placeholder="e.g., Penicillin"
            autoFocus
          />
          <Input
            label="Reaction"
            value={reaction}
            onChange={(e) => setReaction(e.target.value)}
            placeholder="e.g., hives, anaphylaxis"
          />
          <Select
            label="Severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as AllergySeverity | '')}
            options={SEVERITY_OPTIONS}
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
              Add allergy
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
