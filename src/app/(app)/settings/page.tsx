import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SyncSettings } from './sync-settings'
import { InstallPrompt } from '@/components/offline'

export default async function SettingsPage() {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href="/dashboard"
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          ← Dashboard
        </Link>
        <h1 className="screen-title mt-xs">Settings</h1>
      </div>

      <div className="space-y-lg">
        {/* Account */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-md">Account</h2>
          <div className="space-y-sm">
            <div>
              <p className="text-meta text-text-secondary">Email</p>
              <p className="text-body">{session.user.email}</p>
            </div>
            <div>
              <p className="text-meta text-text-secondary">Name</p>
              <p className="text-body">{session.user.name || 'Not set'}</p>
            </div>
          </div>
        </section>

        {/* Sync & Offline */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-md">Sync & Offline</h2>
          <SyncSettings />
        </section>

        {/* Email notifications */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-sm">Email notifications</h2>
          <p className="text-meta text-text-secondary mb-md">
            Configure how and when you receive email updates
          </p>
          <Link
            href="/settings/notifications"
            className="text-accent-primary hover:underline"
          >
            Manage email preferences →
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
              Sign out
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
