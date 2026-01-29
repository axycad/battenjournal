'use client'

import { useState } from 'react'
import { Button, Input, Textarea } from '@/components/ui'
import { createAppointment, type CreateAppointmentInput } from '@/lib/api/appointments'
import type { AppointmentType } from '@prisma/client'

interface AppointmentFormProps {
  caseId: string
  onSuccess?: () => void
  onCancel?: () => void
}

const APPOINTMENT_TYPES: { value: AppointmentType; label: string; emoji: string }[] = [
  { value: 'NEUROLOGY', label: 'Neurology', emoji: '🧠' },
  { value: 'CARDIOLOGY', label: 'Cardiology', emoji: '❤️' },
  { value: 'OPHTHALMOLOGY', label: 'Ophthalmology', emoji: '👁️' },
  { value: 'PHYSICAL_THERAPY', label: 'Physical Therapy', emoji: '🏃' },
  { value: 'OCCUPATIONAL_THERAPY', label: 'Occupational Therapy', emoji: '✋' },
  { value: 'SPEECH_THERAPY', label: 'Speech Therapy', emoji: '💬' },
  { value: 'INFUSION', label: 'Infusion', emoji: '💉' },
  { value: 'PRIMARY_CARE', label: 'Primary Care', emoji: '🏥' },
  { value: 'DENTAL', label: 'Dental', emoji: '🦷' },
  { value: 'OTHER', label: 'Other', emoji: '📅' },
]

const REMINDER_PRESETS = [
  { label: 'None', value: [] },
  { label: '1 hour before', value: [60] },
  { label: '1 day before', value: [1440] },
  { label: '1 day + 1 hour before', value: [1440, 60] },
  { label: '3 days + 1 day before', value: [4320, 1440] },
]

export function AppointmentForm({ caseId, onSuccess, onCancel }: AppointmentFormProps) {
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('NEUROLOGY')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [duration, setDuration] = useState('60')
  const [location, setLocation] = useState('')
  const [provider, setProvider] = useState('')
  const [reminderPreset, setReminderPreset] = useState(0) // Index into REMINDER_PRESETS
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!scheduledDate || !scheduledTime) {
      setError('Date and time are required')
      return
    }

    setSaving(true)

    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)

      const input: CreateAppointmentInput = {
        appointmentType,
        title: title.trim(),
        notes: notes.trim() || undefined,
        scheduledAt: scheduledAt.toISOString(),
        duration: duration ? parseInt(duration) : undefined,
        location: location.trim() || undefined,
        provider: provider.trim() || undefined,
        reminderTimes: REMINDER_PRESETS[reminderPreset].value,
      }

      const result = await createAppointment(caseId, input)

      if (!result.success) {
        setError(result.error || 'Failed to create appointment')
        setSaving(false)
        return
      }

      // Reset form
      setTitle('')
      setNotes('')
      setScheduledDate('')
      setScheduledTime('')
      setDuration('60')
      setLocation('')
      setProvider('')
      setReminderPreset(0)

      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error('Error creating appointment:', err)
      setError('Failed to create appointment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-sm">
      {/* Appointment Type */}
      <div>
        <label className="block text-meta text-text-secondary mb-xs">
          Appointment Type <span className="text-semantic-critical">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-xs">
          {APPOINTMENT_TYPES.map((type) => {
            const isActive = appointmentType === type.value
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setAppointmentType(type.value)}
                className={`px-sm py-2 text-meta rounded-md border transition-colors ${
                  isActive
                    ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                    : 'border-divider text-text-secondary hover:border-accent-primary'
                }`}
              >
                {type.emoji} {type.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-meta text-text-secondary mb-xs">
          Title <span className="text-semantic-critical">*</span>
        </label>
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Dr. Smith follow-up"
          required
        />
      </div>

      {/* Date and Time */}
      <div className="grid gap-sm sm:grid-cols-2">
        <div>
          <label className="block text-meta text-text-secondary mb-xs">
            Date <span className="text-semantic-critical">*</span>
          </label>
          <Input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-meta text-text-secondary mb-xs">
            Time <span className="text-semantic-critical">*</span>
          </label>
          <Input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-meta text-text-secondary mb-xs">
          Duration (minutes)
        </label>
        <Input
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="60"
          min="0"
        />
      </div>

      {/* Location and Provider */}
      <div className="grid gap-sm sm:grid-cols-2">
        <div>
          <label className="block text-meta text-text-secondary mb-xs">Location</label>
          <Input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Hospital or clinic"
          />
        </div>
        <div>
          <label className="block text-meta text-text-secondary mb-xs">Provider</label>
          <Input
            type="text"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="Doctor or therapist"
          />
        </div>
      </div>

      {/* Reminders */}
      <div>
        <label className="block text-meta text-text-secondary mb-xs">Reminders</label>
        <div className="flex flex-wrap gap-xs">
          {REMINDER_PRESETS.map((preset, index) => {
            const isActive = reminderPreset === index
            return (
              <button
                key={index}
                type="button"
                onClick={() => setReminderPreset(index)}
                className={`px-sm py-1 text-meta rounded-full border transition-colors ${
                  isActive
                    ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                    : 'border-divider text-text-secondary hover:border-accent-primary'
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-meta text-text-secondary mb-xs">Notes</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional details..."
          rows={3}
        />
      </div>

      {/* Error */}
      {error && <p className="text-caption text-semantic-critical">{error}</p>}

      {/* Actions */}
      <div className="flex gap-sm">
        <Button type="submit" loading={saving} disabled={saving}>
          {saving ? 'Creating...' : 'Create Appointment'}
        </Button>
        {onCancel && (
          <Button type="button" variant="text" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
