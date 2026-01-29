import { redirect } from 'next/navigation'
import {Link} from '@/navigation'
import { auth } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { getEmailPreferencesAPI, getUserReminderPreferencesAPI } from '@/lib/api/notifications'
import { EmailPreferencesForm } from './email-preferences-form'
import { ReminderPreferences } from '@/components/notifications/reminder-preferences'

export default async function NotificationSettingsPage() {
  const session = await auth()
  const t = await getTranslations('settingsNotifications')

  if (!session?.user?.id) {
    redirect(`/login`)
  }

  const [emailPreferences, reminderPreferences] = await Promise.all([
    getEmailPreferencesAPI(),
    getUserReminderPreferencesAPI(),
  ])

  return (
    <div className="max-w-2xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href="/settings"
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          ← {t('backToSettings')}
        </Link>
        <h1 className="screen-title mt-xs">{t('title')}</h1>
        <p className="text-meta text-text-secondary">
          {t('description')}
        </p>
      </div>

      <div className="space-y-lg">
        {/* Reminder Preferences */}
        <div className="p-md bg-white border border-divider rounded-md">
          <ReminderPreferences
            initialPreferences={{
              medicationReminders: reminderPreferences?.medicationReminders ?? true,
              appointmentReminders: reminderPreferences?.appointmentReminders ?? true,
              dailyLoggingNudges: reminderPreferences?.dailyLoggingNudges ?? false,
              quietHoursStart: reminderPreferences?.quietHoursStart ?? null,
              quietHoursEnd: reminderPreferences?.quietHoursEnd ?? null,
            }}
          />
        </div>

        {/* Email Preferences */}
        <div className="p-md bg-white border border-divider rounded-md">
          <EmailPreferencesForm initialPreferences={emailPreferences} />
        </div>
      </div>
    </div>
  )
}
