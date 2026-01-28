import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {Link} from '@/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { SyncSettings } from './sync-settings'
import { InstallPrompt } from '@/components/offline'
import { AccountPhoto } from './account-photo'

export default async function SettingsPage() {
  const session = await auth()
  const locale = await getLocale()
  const t = await getTranslations('settings')
  if (!session) {
    redirect(`/${locale}/login`)
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true, name: true, email: true },
  })

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href="/dashboard"
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          â† {t('backToDashboard')}
        </Link>
        <h1 className="screen-title mt-xs">{t('title')}</h1>
      </div>

      <div className="space-y-lg">
        {/* Account */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-md">{t('accountTitle')}</h2>
          <div className="space-y-sm">
            <AccountPhoto
              initialUrl={user?.image}
              displayName={user?.name || user?.email || t('userFallback')}
            />
            <div>
              <p className="text-meta text-text-secondary">{t('email')}</p>
              <p className="text-body">{user?.email || session.user.email}</p>
            </div>
            <div>
              <p className="text-meta text-text-secondary">{t('name')}</p>
              <p className="text-body">{user?.name || t('notSet')}</p>
            </div>
          </div>
        </section>

        {/* Sync & Offline */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-md">{t('syncTitle')}</h2>
          <SyncSettings />
        </section>

        {/* Email notifications */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-sm">{t('emailNotificationsTitle')}</h2>
          <p className="text-meta text-text-secondary mb-md">
            {t('emailNotificationsDesc')}
          </p>
          <Link
            href="/settings/notifications"
            className="text-accent-primary hover:underline"
          >
            {t('emailNotificationsLink')} â†’
          </Link>
        </section>

        {/* Install app */}
        <section>
          <InstallPrompt />
        </section>

        {/* Sign out */}
        <section className="p-md bg-white border border-divider rounded-md">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-body text-semantic-critical hover:underline"
            >
              {t('signOut')}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
