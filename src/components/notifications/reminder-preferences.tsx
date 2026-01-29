'use client'

import { useState } from 'react'
import { Button, Input } from '@/components/ui'
import { updateReminderPreferences } from '@/lib/api/notifications'

interface ReminderPreferencesProps {
  initialPreferences: {
    medicationReminders: boolean
    appointmentReminders: boolean
    dailyLoggingNudges: boolean
    quietHoursStart: string | null
    quietHoursEnd: string | null
  }
}

export function ReminderPreferences({ initialPreferences }: ReminderPreferencesProps) {
  const [medicationReminders, setMedicationReminders] = useState(
    initialPreferences.medicationReminders
  )
  const [appointmentReminders, setAppointmentReminders] = useState(
    initialPreferences.appointmentReminders
  )
  const [dailyLoggingNudges, setDailyLoggingNudges] = useState(
    initialPreferences.dailyLoggingNudges
  )
  const [quietHoursStart, setQuietHoursStart] = useState(
    initialPreferences.quietHoursStart || ''
  )
  const [quietHoursEnd, setQuietHoursEnd] = useState(
    initialPreferences.quietHoursEnd || ''
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setSaving(true)

    try {
      const result = await updateReminderPreferences({
        medicationReminders,
        appointmentReminders,
        dailyLoggingNudges,
        quietHoursStart: quietHoursStart || undefined,
        quietHoursEnd: quietHoursEnd || undefined,
      })

      if (result.success) {
        setMessage('Preferences saved successfully')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage(result.error || 'Failed to save preferences')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      setMessage('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-md">
      <div className="space-y-sm">
        <h3 className="text-body font-medium text-text-primary">Reminder Types</h3>
        <p className="text-meta text-text-secondary">
          Choose which gentle reminders you'd like to receive
        </p>

        <div className="space-y-sm">
          <label className="flex items-center gap-sm cursor-pointer">
            <input
              type="checkbox"
              checked={medicationReminders}
              onChange={(e) => setMedicationReminders(e.target.checked)}
              className="w-4 h-4 rounded border-divider text-accent-primary focus:ring-accent-focus"
            />
            <div>
              <p className="text-body text-text-primary">💊 Medication Reminders</p>
              <p className="text-caption text-text-secondary">
                Get notified when it's time to give medications
              </p>
            </div>
          </label>

          <label className="flex items-center gap-sm cursor-pointer">
            <input
              type="checkbox"
              checked={appointmentReminders}
              onChange={(e) => setAppointmentReminders(e.target.checked)}
              className="w-4 h-4 rounded border-divider text-accent-primary focus:ring-accent-focus"
            />
            <div>
              <p className="text-body text-text-primary">📅 Appointment Reminders</p>
              <p className="text-caption text-text-secondary">
                Get notified before upcoming appointments
              </p>
            </div>
          </label>

          <label className="flex items-center gap-sm cursor-pointer">
            <input
              type="checkbox"
              checked={dailyLoggingNudges}
              onChange={(e) => setDailyLoggingNudges(e.target.checked)}
              className="w-4 h-4 rounded border-divider text-accent-primary focus:ring-accent-focus"
            />
            <div>
              <p className="text-body text-text-primary">✍️ Daily Logging Nudges</p>
              <p className="text-caption text-text-secondary">
                Gentle evening reminder if you haven't logged anything today (no pressure!)
              </p>
            </div>
          </label>
        </div>
      </div>

      <div className="space-y-sm">
        <h3 className="text-body font-medium text-text-primary">Quiet Hours</h3>
        <p className="text-meta text-text-secondary">
          Set hours when you don't want to receive reminders (e.g., during sleep)
        </p>

        <div className="grid gap-sm sm:grid-cols-2">
          <div>
            <label className="block text-meta text-text-secondary mb-xs">
              Start time
            </label>
            <Input
              type="time"
              value={quietHoursStart}
              onChange={(e) => setQuietHoursStart(e.target.value)}
              placeholder="22:00"
            />
          </div>
          <div>
            <label className="block text-meta text-text-secondary mb-xs">
              End time
            </label>
            <Input
              type="time"
              value={quietHoursEnd}
              onChange={(e) => setQuietHoursEnd(e.target.value)}
              placeholder="08:00"
            />
          </div>
        </div>
        <p className="text-caption text-text-secondary">
          Leave blank to receive reminders at any time
        </p>
      </div>

      {message && (
        <p
          className={`text-caption ${
            message.includes('success')
              ? 'text-semantic-success'
              : 'text-semantic-critical'
          }`}
        >
          {message}
        </p>
      )}

      <Button type="submit" loading={saving} disabled={saving}>
        {saving ? 'Saving...' : 'Save Preferences'}
      </Button>
    </form>
  )
}
