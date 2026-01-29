'use client'

import { useState } from 'react'
import { Button, Select } from '@/components/ui'
import { updateBaselineAPI, confirmBaselineUnchangedAPI } from '@/lib/api/profile'
import { formatDate } from '@/lib/utils'
import type { PatientProfile, VisionStatus, MobilityStatus, CommunicationStatus, FeedingStatus } from '@prisma/client'

interface BaselineSectionProps {
  caseId: string
  profile: PatientProfile | null
  canEdit: boolean
}

const VISION_OPTIONS = [
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'REDUCED', label: 'Reduced' },
  { value: 'NO_FUNCTIONAL_VISION', label: 'No functional vision' },
]

const MOBILITY_OPTIONS = [
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'INDEPENDENT', label: 'Independent' },
  { value: 'ASSISTED', label: 'Assisted' },
  { value: 'WHEELCHAIR', label: 'Wheelchair' },
  { value: 'NON_AMBULATORY', label: 'Non-ambulatory' },
]

const COMMUNICATION_OPTIONS = [
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'TYPICAL', label: 'Typical' },
  { value: 'LIMITED_SPEECH', label: 'Limited speech' },
  { value: 'NON_VERBAL', label: 'Non-verbal' },
  { value: 'AAC', label: 'AAC device' },
]

const FEEDING_OPTIONS = [
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'ORAL', label: 'Oral' },
  { value: 'MODIFIED_ORAL', label: 'Modified oral' },
  { value: 'TUBE', label: 'Tube fed' },
]

function formatStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown'
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace('Aac', 'AAC')
}

function daysAgo(date: Date | null | undefined): string {
  if (!date) return ''
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return formatDate(date)
}

export function BaselineSection({
  caseId,
  profile,
  canEdit,
}: BaselineSectionProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  const [vision, setVision] = useState<VisionStatus>(profile?.visionStatus || 'UNKNOWN')
  const [mobility, setMobility] = useState<MobilityStatus>(profile?.mobilityStatus || 'UNKNOWN')
  const [communication, setCommunication] = useState<CommunicationStatus>(profile?.communicationStatus || 'UNKNOWN')
  const [feeding, setFeeding] = useState<FeedingStatus>(profile?.feedingStatus || 'UNKNOWN')

  async function handleSave() {
    setSaving(true)
    setError('')

    const result = await updateBaselineAPI(caseId, {
      visionStatus: vision,
      mobilityStatus: mobility,
      communicationStatus: communication,
      feedingStatus: feeding,
    })

    if (!result.success) {
      setError(result.error || 'Failed to save')
    } else {
      setEditing(false)
    }
    setSaving(false)
  }

  async function handleConfirmUnchanged() {
    setConfirming(true)
    setError('')

    const result = await confirmBaselineUnchangedAPI(caseId, [
      'vision',
      'mobility',
      'communication',
      'feeding',
    ])

    if (!result.success) {
      setError(result.error || 'Failed to confirm')
    }
    setConfirming(false)
  }

  function handleCancel() {
    setVision(profile?.visionStatus || 'UNKNOWN')
    setMobility(profile?.mobilityStatus || 'UNKNOWN')
    setCommunication(profile?.communicationStatus || 'UNKNOWN')
    setFeeding(profile?.feedingStatus || 'UNKNOWN')
    setEditing(false)
    setError('')
  }

  if (editing) {
    return (
      <section className="p-md bg-white border border-divider rounded-md">
        <h2 className="section-header mb-md">Baseline status</h2>
        <p className="text-meta text-text-secondary mb-md">
          Current functional abilities for emergency responders
        </p>
        <div className="space-y-sm">
          <Select
            label="Vision"
            value={vision}
            onChange={(e) => setVision(e.target.value as VisionStatus)}
            options={VISION_OPTIONS}
          />
          <Select
            label="Mobility"
            value={mobility}
            onChange={(e) => setMobility(e.target.value as MobilityStatus)}
            options={MOBILITY_OPTIONS}
          />
          <Select
            label="Communication"
            value={communication}
            onChange={(e) => setCommunication(e.target.value as CommunicationStatus)}
            options={COMMUNICATION_OPTIONS}
          />
          <Select
            label="Feeding"
            value={feeding}
            onChange={(e) => setFeeding(e.target.value as FeedingStatus)}
            options={FEEDING_OPTIONS}
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

  // Find oldest confirmation date to suggest review
  const confirmDates = [
    profile?.visionConfirmedAt,
    profile?.mobilityConfirmedAt,
    profile?.communicationConfirmedAt,
    profile?.feedingConfirmedAt,
  ].filter(Boolean) as Date[]
  
  const oldestConfirm = confirmDates.length > 0
    ? new Date(Math.min(...confirmDates.map((d) => d.getTime())))
    : null
  
  const daysSinceConfirm = oldestConfirm
    ? Math.floor((Date.now() - oldestConfirm.getTime()) / (1000 * 60 * 60 * 24))
    : null
  
  const needsReview = daysSinceConfirm !== null && daysSinceConfirm > 30

  return (
    <section className="p-md bg-white border border-divider rounded-md">
      <div className="flex items-center justify-between mb-md">
        <div>
          <h2 className="section-header">Baseline status</h2>
          <p className="text-meta text-text-secondary">
            Current functional abilities
          </p>
        </div>
        {canEdit && (
          <Button variant="text" onClick={() => setEditing(true)} className="h-auto px-0">
            Edit
          </Button>
        )}
      </div>

      <dl className="space-y-xs">
        <div className="flex justify-between">
          <dt className="text-text-secondary">Vision</dt>
          <dd>
            {formatStatus(profile?.visionStatus)}
            {profile?.visionConfirmedAt && (
              <span className="text-caption text-text-secondary ml-2">
                ({daysAgo(profile.visionConfirmedAt)})
              </span>
            )}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-secondary">Mobility</dt>
          <dd>
            {formatStatus(profile?.mobilityStatus)}
            {profile?.mobilityConfirmedAt && (
              <span className="text-caption text-text-secondary ml-2">
                ({daysAgo(profile.mobilityConfirmedAt)})
              </span>
            )}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-secondary">Communication</dt>
          <dd>
            {formatStatus(profile?.communicationStatus)}
            {profile?.communicationConfirmedAt && (
              <span className="text-caption text-text-secondary ml-2">
                ({daysAgo(profile.communicationConfirmedAt)})
              </span>
            )}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-secondary">Feeding</dt>
          <dd>
            {formatStatus(profile?.feedingStatus)}
            {profile?.feedingConfirmedAt && (
              <span className="text-caption text-text-secondary ml-2">
                ({daysAgo(profile.feedingConfirmedAt)})
              </span>
            )}
          </dd>
        </div>
      </dl>

      {canEdit && needsReview && (
        <div className="mt-md pt-md border-t border-divider">
          <p className="text-meta text-text-secondary mb-xs">
            Last confirmed over 30 days ago
          </p>
          <Button
            variant="secondary"
            onClick={handleConfirmUnchanged}
            loading={confirming}
            className="h-auto py-2"
          >
            Confirm unchanged today
          </Button>
        </div>
      )}

      {error && <p className="mt-sm text-caption text-semantic-critical">{error}</p>}
    </section>
  )
}
