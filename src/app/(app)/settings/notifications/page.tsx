import { redirect } from 'next/navigation'
import {Link} from '@/navigation'
import { auth } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { getEmailPreferences } from '@/actions/email-notifications'
import { EmailPreferencesForm } from './email-preferences-form'

export default async function NotificationSettingsPage() {
  const session = await auth()
  const t = await getTranslations('settingsNotifications')

  if (!session?.user?.id) {
    redirect(`/login`)
  }

  const preferences = await getEmailPreferences()

  return (
    <div className="max-w-2xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href="/settings"
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          â† {t('backToSettings')}
        </Link>
        <h1 className="screen-title mt-xs">{t('title')}</h1>
        <p className="text-meta text-text-secondary">
          {t('description')}
        </p>
      </div>

      <EmailPreferencesForm initialPreferences={preferences} />
    </div>
  )
}
