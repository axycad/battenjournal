'use client'

import { useState } from 'react'
import { Button, Input, Textarea } from '@/components/ui'
import { updateCareIntentAPI } from '@/lib/api/profile'
import type { CareIntent } from '@prisma/client'

interface CareIntentSectionProps {
  caseId: string
  careIntent: CareIntent | null
  canEdit: boolean
}

export function CareIntentSection({
  caseId,
  careIntent,
  canEdit,
}: CareIntentSectionProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [preferredHospital, setPreferredHospital] = useState(careIntent?.preferredHospital || '')
  const [emergencyPreferences, setEmergencyPreferences] = useState(careIntent?.emergencyPreferences || '')
  const [avoidList, setAvoidList] = useState(careIntent?.avoidList || '')
  const [communicationNotes, setCommunicationNotes] = useState(careIntent?.communicationNotes || '')
  const [keyEquipment, setKeyEquipment] = useState(careIntent?.keyEquipment || '')

  async function handleSave() {
    setSaving(true)
    setError('')

    const result = await updateCareIntentAPI(caseId, {
      preferredHospital: preferredHospital.trim() || undefined,
      emergencyPreferences: emergencyPreferences.trim() || undefined,
      avoidList: avoidList.trim() || undefined,
      communicationNotes: communicationNotes.trim() || undefined,
      keyEquipment: keyEquipment.trim() || undefined,
    })

    if (!result.success) {
      setError(result.error || 'Failed to save')
    } else {
      setEditing(false)
    }
    setSaving(false)
  }

  function handleCancel() {
    setPreferredHospital(careIntent?.preferredHospital || '')
    setEmergencyPreferences(careIntent?.emergencyPreferences || '')
    setAvoidList(careIntent?.avoidList || '')
    setCommunicationNotes(careIntent?.communicationNotes || '')
    setKeyEquipment(careIntent?.keyEquipment || '')
    setEditing(false)
    setError('')
  }

  const hasContent =
    careIntent?.preferredHospital ||
    careIntent?.emergencyPreferences ||
    careIntent?.avoidList ||
    careIntent?.communicationNotes ||
    careIntent?.keyEquipment

  if (editing) {
    return (
      <section className="p-md bg-white border border-divider rounded-md">
        <h2 className="section-header mb-md">Emergency preferences</h2>
        <p className="text-meta text-text-secondary mb-md">
          Instructions for emergency responders
        </p>
        <div className="space-y-sm">
          <Input
            label="Preferred hospital"
            value={preferredHospital}
            onChange={(e) => setPreferredHospital(e.target.value)}
            placeholder="e.g., Great Ormond Street Hospital"
          />
          <Textarea
            label="Emergency instructions"
            value={emergencyPreferences}
            onChange={(e) => setEmergencyPreferences(e.target.value)}
            placeholder="What responders should know or do first"
            rows={3}
          />
          <Textarea
            label="Avoid list"
            value={avoidList}
            onChange={(e) => setAvoidList(e.target.value)}
            placeholder="Medications, procedures, or actions to avoid"
            rows={2}
          />
          <Textarea
            label="Communication notes"
            value={communicationNotes}
            onChange={(e) => setCommunicationNotes(e.target.value)}
            placeholder="e.g., responds to voice, uses AAC device, non-verbal"
            rows={2}
          />
          <Textarea
            label="Key equipment"
            value={keyEquipment}
            onChange={(e) => setKeyEquipment(e.target.value)}
            placeholder="e.g., PEG tube, suction machine, oxygen"
            rows={2}
          />

          {error && <p className="text-caption text-semantic-critical">{error}</p>}

          <div className="flex gap-sm pt-sm">
            <Button variant="secondary" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="p-md bg-white border border-divider rounded-md">
      <div className="flex items-center justify-between mb-md">
        <div>
          <h2 className="section-header">Emergency preferences</h2>
          <p className="text-meta text-text-secondary">
            Instructions for emergency responders
          </p>
        </div>
        {canEdit && (
          <Button variant="text" onClick={() => setEditing(true)} className="h-auto px-0">
            Edit
          </Button>
        )}
      </div>

      {!hasContent && (
        <p className="text-text-secondary">No preferences recorded</p>
      )}

      {hasContent && (
        <dl className="space-y-sm">
          {careIntent?.preferredHospital && (
            <div>
              <dt className="text-meta text-text-secondary">Preferred hospital</dt>
              <dd className="text-body">{careIntent.preferredHospital}</dd>
            </div>
          )}
          {careIntent?.emergencyPreferences && (
            <div>
              <dt className="text-meta text-text-secondary">Emergency instructions</dt>
              <dd className="text-body whitespace-pre-wrap">{careIntent.emergencyPreferences}</dd>
            </div>
          )}
          {careIntent?.avoidList && (
            <div>
              <dt className="text-meta text-text-secondary">Avoid</dt>
              <dd className="text-body whitespace-pre-wrap">{careIntent.avoidList}</dd>
            </div>
          )}
          {careIntent?.communicationNotes && (
            <div>
              <dt className="text-meta text-text-secondary">Communication</dt>
              <dd className="text-body whitespace-pre-wrap">{careIntent.communicationNotes}</dd>
            </div>
          )}
          {careIntent?.keyEquipment && (
            <div>
              <dt className="text-meta text-text-secondary">Key equipment</dt>
              <dd className="text-body whitespace-pre-wrap">{careIntent.keyEquipment}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  )
}
