import { redirect } from 'next/navigation'
import {Link} from '@/navigation'
import { auth } from '@/lib/auth'
import {
  getNotificationCountsAPI,
  getRecentNotificationsAPI,
} from '@/lib/api/notifications'
import { NotificationSummary, NotificationList } from '@/components/notifications'

export default async function NotificationsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect(`/login`)
  }

  const [counts, notifications] = await Promise.all([
    getNotificationCountsAPI(),
    getRecentNotificationsAPI(50),
  ])

  const unreadNotifications = notifications.filter((n) => !n.read)
  const readNotifications = notifications.filter((n) => n.read)

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href="/dashboard"
          className="text-meta text-purple-600 hover:text-purple-700 hover:underline"
        >
          ← Dashboard
        </Link>
        <h1 className="text-h2 font-bold text-text-primary mt-xs">Notifications</h1>
      </div>

      {/* Summary */}
      <section className="mb-lg p-md bg-white border border-purple-100 rounded-lg shadow-sm">
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
