'use client'

import { useState } from 'react'
import { Link } from '@/navigation'
import { markNotificationRead, deleteNotification, type NotificationData } from '@/actions/notification'

interface NotificationListProps {
  notifications: NotificationData[]
}

const NOTIFICATION_ICONS: Record<string, string> = {
  MEDICATION_REMINDER: '💊',
  APPOINTMENT_REMINDER: '📅',
  DAILY_LOGGING_NUDGE: '✍️',
  MESSAGE: '💬',
  WATCH_ALERT: '👀',
  TASK_REMINDER: '✅',
  GENERAL: '🔔',
}

export function NotificationList({ notifications }: NotificationListProps) {
  const [localNotifications, setLocalNotifications] = useState(notifications)
  const [processing, setProcessing] = useState<string | null>(null)

  const handleMarkRead = async (notificationId: string) => {
    setProcessing(notificationId)
    try {
      await markNotificationRead(notificationId)
      setLocalNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, readAt: new Date() } : n
        )
      )
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    } finally {
      setProcessing(null)
    }
  }

  const handleDelete = async (notificationId: string) => {
    setProcessing(notificationId)
    try {
      await deleteNotification(notificationId)
      setLocalNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    } catch (error) {
      console.error('Failed to delete notification:', error)
      setProcessing(null)
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - new Date(date).getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`

    return new Date(date).toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (localNotifications.length === 0) {
    return (
      <div className="p-lg text-center">
        <p className="text-body text-text-secondary">No notifications yet</p>
        <p className="text-meta text-text-secondary mt-xs">
          You'll see medication reminders, appointment alerts, and gentle logging nudges here
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-divider">
      {localNotifications.map((notification) => {
        const isUnread = !notification.readAt
        const icon = NOTIFICATION_ICONS[notification.type] || '🔔'

        return (
          <div
            key={notification.id}
            className={`p-md hover:bg-bg-primary transition-colors ${
              isUnread ? 'bg-accent-primary/5' : ''
            }`}
          >
            <div className="flex items-start gap-sm">
              <span className="text-2xl flex-shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-sm mb-xs">
                  <p className="text-body font-medium text-text-primary">
                    {notification.title}
                  </p>
                  <span className="text-caption text-text-secondary whitespace-nowrap">
                    {formatTime(notification.createdAt)}
                  </span>
                </div>
                <p className="text-meta text-text-secondary mb-sm">
                  {notification.body}
                </p>

                <div className="flex flex-wrap gap-xs">
                  {notification.actionUrl && (
                    <Link
                      href={notification.actionUrl}
                      onClick={() => !isUnread || handleMarkRead(notification.id)}
                      className="text-caption text-accent-primary hover:underline"
                    >
                      View →
                    </Link>
                  )}

                  {isUnread && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(notification.id)}
                      disabled={processing === notification.id}
                      className="text-caption text-text-secondary hover:text-accent-primary disabled:opacity-50"
                    >
                      Mark read
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(notification.id)}
                    disabled={processing === notification.id}
                    className="text-caption text-text-secondary hover:text-semantic-critical disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
