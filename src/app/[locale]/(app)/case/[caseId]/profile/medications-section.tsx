'use client'

import { useState } from 'react'
import { Button, Input } from '@/components/ui'
import { addMedicationAPI, updateMedicationAPI, deleteMedicationAPI } from '@/lib/api/profile'
import type { Medication } from '@prisma/client'

interface MedicationsSectionProps {
  caseId: string
  medications: Medication[]
  canEdit: boolean
}

export function MedicationsSection({
  caseId,
  medications,
  canEdit,
}: MedicationsSectionProps) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [route, setRoute] = useState('')
  const [schedule, setSchedule] = useState('')

  function resetForm() {
    setName('')
    setDose('')
    setRoute('')
    setSchedule('')
    setError('')
  }

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    setError('')

    const result = await addMedicationAPI(caseId, {
      name: name.trim(),
      dose: dose.trim() || undefined,
      route: route.trim() || undefined,
      schedule: schedule.trim() || undefined,
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

    const result = await updateMedicationAPI(id, {
      name: name.trim(),
      dose: dose.trim() || undefined,
      route: route.trim() || undefined,
      schedule: schedule.trim() || undefined,
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
    const result = await deleteMedicationAPI(id)
    if (!result.success) {
      setError(result.error || 'Failed to delete')
    }
    setDeletingId(null)
    setSaving(false)
  }

  function startEdit(med: Medication) {
    setEditingId(med.id)
    setName(med.name)
    setDose(med.dose || '')
    setRoute(med.route || '')
    setSchedule(med.schedule || '')
  }

  function cancelEdit() {
    setEditingId(null)
    resetForm()
  }

  return (
    <section className="p-md bg-white border border-divider rounded-md">
      <div className="flex items-center justify-between mb-md">
        <h2 className="section-header">Active medications</h2>
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

      {medications.length === 0 && !adding && (
        <p className="text-text-secondary">No active medications</p>
      )}

      <ul className="divide-y divide-divider">
        {medications.map((med) => {
          if (editingId === med.id) {
            return (
              <li key={med.id} className="py-sm">
                <div className="space-y-sm">
                  <Input
                    label="Medication name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-sm">
                    <Input
                      label="Dose"
                      value={dose}
                      onChange={(e) => setDose(e.target.value)}
                      placeholder="e.g., 250mg"
                    />
                    <Input
                      label="Route"
                      value={route}
                      onChange={(e) => setRoute(e.target.value)}
                      placeholder="e.g., oral, IV"
                    />
                  </div>
                  <Input
                    label="Schedule"
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    placeholder="e.g., twice daily, as needed"
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
                      onClick={() => handleUpdate(med.id)}
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

          if (deletingId === med.id) {
            return (
              <li key={med.id} className="py-sm">
                <p className="text-body mb-sm">
                  Remove {med.name} from medications?
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
                    onClick={() => handleDelete(med.id)}
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
            <li key={med.id} className="py-sm flex items-start justify-between">
              <div>
                <p className="text-body font-medium">{med.name}</p>
                <p className="text-meta text-text-secondary">
                  {[med.dose, med.route, med.schedule].filter(Boolean).join(' · ')}
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-sm">
                  <Button
                    variant="text"
                    onClick={() => startEdit(med)}
                    className="h-auto px-0 text-meta"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => setDeletingId(med.id)}
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
            label="Medication name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Levetiracetam"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-sm">
            <Input
              label="Dose"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder="e.g., 250mg"
            />
            <Input
              label="Route"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder="e.g., oral, IV"
            />
          </div>
          <Input
            label="Schedule"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder="e.g., twice daily, as needed"
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
              Add medication
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
