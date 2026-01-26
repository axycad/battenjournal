'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Textarea, Input } from '@/components/ui'
import {
  logMedicationAdministration,
  skipMedication,
  deleteAdministration,
  updateMedicationReminders,
  type MedicationWithAdministrations,
  type AdministrationRecord,
} from '@/actions/medication-admin'
import { formatDate } from '@/lib/utils'

// ============================================================================
// MEDICATION CARD
// ============================================================================

interface MedicationCardProps {
  medication: MedicationWithAdministrations
  caseId: string
  onAdministered?: () => void
}

export function MedicationCard({ medication, caseId, onAdministered }: MedicationCardProps) {
  const router = useRouter()
  const [showGiveForm, setShowGiveForm] = useState(false)
  const [showSkipForm, setShowSkipForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Give form state
  const [dose, setDose] = useState(medication.dose || '')
  const [notes, setNotes] = useState('')
  const [prnReason, setPrnReason] = useState('')

  // Skip form state
  const [skipReason, setSkipReason] = useState('')

  async function handleGive() {
    if (medication.isPRN && !prnReason.trim()) {
      setError('Please provide a reason for giving this PRN medication')
      return
    }

    setSaving(true)
    setError('')

    const result = await logMedicationAdministration({
      caseId,
      medicationId: medication.id,
      dose: dose.trim() || undefined,
      notes: notes.trim() || undefined,
      prnReason: prnReason.trim() || undefined,
    })

    if (!result.success) {
      setError(result.error || 'Failed to log')
    } else {
      setShowGiveForm(false)
      setDose(medication.dose || '')
      setNotes('')
      setPrnReason('')
      router.refresh()
      onAdministered?.()
    }

    setSaving(false)
  }

  async function handleSkip() {
    if (!skipReason.trim()) {
      setError('Please provide a reason for skipping')
      return
    }

    setSaving(true)
    setError('')

    const result = await skipMedication({
      caseId,
      medicationId: medication.id,
      skipReason: skipReason.trim(),
    })

    if (!result.success) {
      setError(result.error || 'Failed to log')
    } else {
      setShowSkipForm(false)
      setSkipReason('')
      router.refresh()
    }

    setSaving(false)
  }

  const timeSinceLastDose = medication.lastAdministration
    ? getTimeSince(medication.lastAdministration.givenAt)
    : null

  return (
    <div className="p-md bg-white border border-divider rounded-md">
      <div className="flex items-start justify-between mb-sm">
        <div>
          <div className="flex items-center gap-sm">
            <h3 className="text-body font-medium">{medication.name}</h3>
            {medication.isPRN && (
              <span className="px-xs py-0.5 text-caption bg-semantic-warning/10 text-semantic-warning rounded">
                PRN
              </span>
            )}
          </div>
          <p className="text-meta text-text-secondary">
            {medication.dose && `${medication.dose}`}
            {medication.dose && medication.route && ' · '}
            {medication.route}
            {medication.schedule && !medication.isPRN && ` · ${medication.schedule}`}
          </p>
        </div>

        {!showGiveForm && !showSkipForm && (
          <div className="flex gap-xs">
            <Button onClick={() => setShowGiveForm(true)} className="h-auto py-1">
              Give
            </Button>
            {!medication.isPRN && (
              <Button
                variant="secondary"
                onClick={() => setShowSkipForm(true)}
                className="h-auto py-1"
              >
                Skip
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Last administration info */}
      {medication.lastAdministration && (
        <p className="text-caption text-text-secondary mb-sm">
          Last given {timeSinceLastDose}
          {medication.lastAdministration.givenBy && ` by ${medication.lastAdministration.givenBy}`}
          {medication.todayCount > 0 && ` · ${medication.todayCount} time${medication.todayCount !== 1 ? 's' : ''} today`}
        </p>
      )}

      {/* Give form */}
      {showGiveForm && (
        <div className="mt-sm pt-sm border-t border-divider space-y-sm">
          <div>
            <label className="block text-meta text-text-secondary mb-xs">
              Dose given
            </label>
            <Input
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder={medication.dose || 'Enter dose'}
            />
          </div>

          {medication.isPRN && (
            <div>
              <label className="block text-meta text-text-secondary mb-xs">
                Reason for giving (required for PRN)
              </label>
              <Textarea
                value={prnReason}
                onChange={(e) => setPrnReason(e.target.value)}
                placeholder="Why is this medication being given now?"
                rows={2}
              />
            </div>
          )}

          <div>
            <label className="block text-meta text-text-secondary mb-xs">
              Notes (optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations or notes"
              rows={2}
            />
          </div>

          {error && <p className="text-caption text-semantic-critical">{error}</p>}

          <div className="flex gap-sm">
            <Button onClick={handleGive} loading={saving}>
              Log administration
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowGiveForm(false)
                setError('')
              }}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Skip form */}
      {showSkipForm && (
        <div className="mt-sm pt-sm border-t border-divider space-y-sm">
          <div>
            <label className="block text-meta text-text-secondary mb-xs">
              Why is this dose being skipped?
            </label>
            <Textarea
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="e.g., Child was sleeping, vomited, refused"
              rows={2}
              autoFocus
            />
          </div>

          {error && <p className="text-caption text-semantic-critical">{error}</p>}

          <div className="flex gap-sm">
            <Button onClick={handleSkip} loading={saving}>
              Log skip
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowSkipForm(false)
                setError('')
              }}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MEDICATION LIST
// ============================================================================

interface MedicationListProps {
  medications: MedicationWithAdministrations[]
  caseId: string
}

export function MedicationList({ medications, caseId }: MedicationListProps) {
  const scheduledMeds = medications.filter((m) => !m.isPRN)
  const prnMeds = medications.filter((m) => m.isPRN)

  if (medications.length === 0) {
    return (
      <p className="text-meta text-text-secondary italic py-md">
        No active medications
      </p>
    )
  }

  return (
    <div className="space-y-lg">
      {scheduledMeds.length > 0 && (
        <div>
          <h3 className="text-meta text-text-secondary uppercase tracking-wide mb-sm">
            Scheduled
          </h3>
          <div className="space-y-sm">
            {scheduledMeds.map((med) => (
              <MedicationCard key={med.id} medication={med} caseId={caseId} />
            ))}
          </div>
        </div>
      )}

      {prnMeds.length > 0 && (
        <div>
          <h3 className="text-meta text-text-secondary uppercase tracking-wide mb-sm">
            As needed (PRN)
          </h3>
          <div className="space-y-sm">
            {prnMeds.map((med) => (
              <MedicationCard key={med.id} medication={med} caseId={caseId} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// ADMINISTRATION HISTORY
// ============================================================================

interface AdministrationHistoryProps {
  records: AdministrationRecord[]
  showMedicationName?: boolean
}

export function AdministrationHistory({
  records,
  showMedicationName = true,
}: AdministrationHistoryProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    const result = await deleteAdministration(id)
    if (result.success) {
      router.refresh()
    }
    setDeleting(null)
  }

  if (records.length === 0) {
    return (
      <p className="text-meta text-text-secondary italic py-md">
        No administration history
      </p>
    )
  }

  // Group by date
  const grouped = records.reduce((acc, record) => {
    const dateKey = record.givenAt.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(record)
    return acc
  }, {} as Record<string, AdministrationRecord[]>)

  return (
    <div className="space-y-md">
      {Object.entries(grouped).map(([date, dayRecords]) => (
        <div key={date}>
          <h4 className="text-meta text-text-secondary mb-sm">{date}</h4>
          <div className="space-y-xs">
            {dayRecords.map((record) => (
              <div
                key={record.id}
                className={`p-sm rounded-sm ${
                  record.skipped ? 'bg-semantic-warning/5' : 'bg-bg-primary'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-body">
                      {record.givenAt.toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {showMedicationName && (
                        <span className="font-medium ml-sm">{record.medicationName}</span>
                      )}
                      {record.skipped && (
                        <span className="ml-sm px-xs py-0.5 text-caption bg-semantic-warning/20 text-semantic-warning rounded">
                          Skipped
                        </span>
                      )}
                    </p>
                    {!record.skipped && record.dose && (
                      <p className="text-meta text-text-secondary">
                        {record.dose}
                        {record.route && ` · ${record.route}`}
                      </p>
                    )}
                    {record.prnReason && (
                      <p className="text-meta text-text-secondary">
                        PRN reason: {record.prnReason}
                      </p>
                    )}
                    {record.skipReason && (
                      <p className="text-meta text-text-secondary">
                        Reason: {record.skipReason}
                      </p>
                    )}
                    {record.notes && (
                      <p className="text-meta text-text-secondary mt-xs">
                        {record.notes}
                      </p>
                    )}
                  </div>

                  {deleting === record.id ? (
                    <div className="flex gap-xs">
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-caption text-semantic-critical hover:underline"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleting(null)}
                        className="text-caption text-text-secondary hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleting(record.id)}
                      className="text-caption text-text-secondary hover:text-semantic-critical"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// REMINDER SETTINGS
// ============================================================================

interface ReminderSettingsProps {
  medication: MedicationWithAdministrations
}

export function ReminderSettings({ medication }: ReminderSettingsProps) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(medication.reminderEnabled)
  const [times, setTimes] = useState<string[]>(medication.reminderTimes || [])
  const [newTime, setNewTime] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await updateMedicationReminders(medication.id, enabled, times)
    router.refresh()
    setSaving(false)
  }

  function addTime() {
    if (newTime && !times.includes(newTime)) {
      setTimes([...times, newTime].sort())
      setNewTime('')
    }
  }

  function removeTime(time: string) {
    setTimes(times.filter((t) => t !== time))
  }

  return (
    <div className="p-md bg-white border border-divider rounded-md">
      <h3 className="text-body font-medium mb-sm">Reminders for {medication.name}</h3>
      <p className="text-meta text-text-secondary mb-md">
        Configure when you want to be reminded to give this medication.
        Reminders are optional and can be turned off anytime.
      </p>

      <label className="flex items-center gap-sm mb-md cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="rounded border-divider text-accent-primary"
        />
        <span className="text-body">Enable reminders</span>
      </label>

      {enabled && (
        <div className="space-y-sm">
          <div className="flex flex-wrap gap-xs">
            {times.map((time) => (
              <span
                key={time}
                className="inline-flex items-center gap-xs px-sm py-1 bg-bg-primary rounded-sm"
              >
                {time}
                <button
                  onClick={() => removeTime(time)}
                  className="text-text-secondary hover:text-semantic-critical"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-sm">
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="px-sm py-1 text-body border border-divider rounded-sm"
            />
            <Button variant="secondary" onClick={addTime} className="h-auto py-1">
              Add time
            </Button>
          </div>
        </div>
      )}

      <div className="mt-md pt-md border-t border-divider">
        <Button onClick={handleSave} loading={saving}>
          Save reminders
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function getTimeSince(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  }
}
