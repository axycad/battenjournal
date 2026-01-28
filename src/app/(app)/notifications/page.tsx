import { redirect } from 'next/navigation'
import {Link} from '@/navigation'
import { auth } from '@/lib/auth'
import { getLocale } from 'next-intl/server'
import {
  getNotificationCounts,
  getRecentNotifications,
} from '@/actions/notifications'
import { NotificationSummary, NotificationList } from '@/components/notifications'

export default async function NotificationsPage() {
  const session = await auth()
  const locale = await getLocale()

  if (!session?.user?.id) {
    redirect(`/${locale}/login`)
  }

  const [counts, notifications] = await Promise.all([
    getNotificationCounts(),
    getRecentNotifications(50),
  ])

  const unreadNotifications = notifications.filter((n) => !n.read)
  const readNotifications = notifications.filter((n) => n.read)

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href="/dashboard"
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          ← Dashboard
        </Link>
        <h1 className="screen-title mt-xs">Notifications</h1>
      </div>

      {/* Summary */}
      <section className="mb-lg p-md bg-white border border-divider rounded-md">
        <h2 className="section-header mb-sm">Summary</h2>
        <NotificationSummary counts={counts} />
      </section>

      {/* Unread notifications */}
      <section className="mb-lg">
        <h2 className="section-header mb-sm">
          Unread
          {unreadNotifications.length > 0 && (
            <span className="ml-sm text-caption text-text-secondary font-normal">
              ({unreadNotifications.length})
            </span>
          )}
        </h2>
        <NotificationList
          notifications={unreadNotifications}
          emptyMessage="All caught up!"
        />
      </section>

      {/* Earlier notifications */}
      {readNotifications.length > 0 && (
        <section>
          <h2 className="section-header mb-sm">Earlier</h2>
          <NotificationList notifications={readNotifications} />
        </section>
      )}
    </div>
  )
}
