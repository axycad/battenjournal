import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getEmailPreferences } from '@/actions/email-notifications'
import { EmailPreferencesForm } from './email-preferences-form'

export default async function NotificationSettingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const preferences = await getEmailPreferences()

  return (
    <div className="max-w-2xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href="/settings"
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          ← Settings
        </Link>
        <h1 className="screen-title mt-xs">Email notifications</h1>
        <p className="text-meta text-text-secondary">
          Choose how and when you receive email updates
        </p>
      </div>

      <EmailPreferencesForm initialPreferences={preferences} />
    </div>
  )
}
