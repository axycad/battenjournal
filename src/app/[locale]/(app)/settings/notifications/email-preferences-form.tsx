'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import {
  updateEmailPreferences,
  type EmailPreferences,
  type DigestFrequency,
} from '@/actions/email-notifications'

interface EmailPreferencesFormProps {
  initialPreferences: EmailPreferences | null
}

const FREQUENCY_OPTIONS: { value: DigestFrequency; label: string; description: string }[] = [
  { value: 'OFF', label: 'Off', description: 'No email notifications' },
  { value: 'IMMEDIATE', label: 'Immediate', description: 'As soon as something happens' },
  { value: 'DAILY', label: 'Daily digest', description: 'Once a day summary' },
  { value: 'WEEKLY', label: 'Weekly digest', description: 'Once a week summary' },
]

export function EmailPreferencesForm({ initialPreferences }: EmailPreferencesFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [digestFrequency, setDigestFrequency] = useState<DigestFrequency>(
    initialPreferences?.digestFrequency || 'DAILY'
  )
  const [watchAlerts, setWatchAlerts] = useState(
    initialPreferences?.watchAlerts ?? true
  )
  const [taskReminders, setTaskReminders] = useState(
    initialPreferences?.taskReminders ?? true
  )
  const [messageNotifications, setMessageNotifications] = useState(
    initialPreferences?.messageNotifications ?? true
  )

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)

    const result = await updateEmailPreferences({
      digestFrequency,
      watchAlerts,
      taskReminders,
      messageNotifications,
    })

    if (!result.success) {
      setError(result.error || 'Failed to save')
    } else {
      setSaved(true)
      router.refresh()
    }

    setSaving(false)
  }

  const isOff = digestFrequency === 'OFF'

  return (
    <div className="space-y-lg">
      {/* Frequency */}
      <section className="p-md bg-white border border-divider rounded-md">
        <h2 className="text-body font-medium mb-sm">Email frequency</h2>
        <p className="text-meta text-text-secondary mb-md">
          How often do you want to receive email updates?
        </p>

        <div className="space-y-sm">
          {FREQUENCY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-sm p-sm rounded-sm border cursor-pointer transition-colors ${
                digestFrequency === option.value
                  ? 'border-accent-primary bg-accent-primary/5'
                  : 'border-divider hover:border-accent-primary/50'
              }`}
            >
              <input
                type="radio"
                name="frequency"
                value={option.value}
                checked={digestFrequency === option.value}
                onChange={() => setDigestFrequency(option.value)}
                className="mt-1 text-accent-primary"
              />
              <div>
                <p className="text-body font-medium">{option.label}</p>
                <p className="text-meta text-text-secondary">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Notification types */}
      <section
        className={`p-md bg-white border border-divider rounded-md ${
          isOff ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <h2 className="text-body font-medium mb-sm">What to include</h2>
        <p className="text-meta text-text-secondary mb-md">
          Choose which types of updates to receive
        </p>

        <div className="space-y-sm">
          <label className="flex items-center gap-sm cursor-pointer">
            <input
              type="checkbox"
              checked={messageNotifications}
              onChange={(e) => setMessageNotifications(e.target.checked)}
              disabled={isOff}
              className="rounded border-divider text-accent-primary"
            />
            <div>
              <p className="text-body">New messages</p>
              <p className="text-meta text-text-secondary">
                When someone sends you a message in a care thread
              </p>
            </div>
          </label>

          <label className="flex items-center gap-sm cursor-pointer">
            <input
              type="checkbox"
              checked={watchAlerts}
              onChange={(e) => setWatchAlerts(e.target.checked)}
              disabled={isOff}
              className="rounded border-divider text-accent-primary"
            />
            <div>
              <p className="text-body">Watched updates</p>
              <p className="text-meta text-text-secondary">
                When new entries are logged in categories you're watching
              </p>
            </div>
          </label>

          <label className="flex items-center gap-sm cursor-pointer">
            <input
              type="checkbox"
              checked={taskReminders}
              onChange={(e) => setTaskReminders(e.target.checked)}
              disabled={isOff}
              className="rounded border-divider text-accent-primary"
            />
            <div>
              <p className="text-body">Task reminders</p>
              <p className="text-meta text-text-secondary">
                When you have tasks due or overdue
              </p>
            </div>
          </label>
        </div>
      </section>

      {error && (
        <div className="p-sm bg-semantic-critical/5 border border-semantic-critical/30 rounded-sm">
          <p className="text-meta text-semantic-critical">{error}</p>
        </div>
      )}

      {saved && (
        <div className="p-sm bg-semantic-success/5 border border-semantic-success/30 rounded-sm">
          <p className="text-meta text-semantic-success">Preferences saved</p>
        </div>
      )}

      <Button onClick={handleSave} loading={saving}>
        Save preferences
      </Button>
    </div>
  )
}
