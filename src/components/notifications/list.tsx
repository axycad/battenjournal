'use client'

import {Link} from '@/navigation'
import type { NotificationItem } from '@/lib/api/notifications'
import { formatDate } from '@/lib/utils'

// ============================================================================
// NOTIFICATION LIST
// ============================================================================

interface NotificationListProps {
  notifications: NotificationItem[]
  emptyMessage?: string
}

export function NotificationList({
  notifications,
  emptyMessage = 'No notifications',
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <p className="text-meta text-text-secondary italic py-md">{emptyMessage}</p>
    )
  }

  return (
    <div className="space-y-xs">
      {notifications.map((notification) => (
        <NotificationCard key={notification.id} notification={notification} />
      ))}
    </div>
  )
}

// ============================================================================
// NOTIFICATION CARD
// ============================================================================

interface NotificationCardProps {
  notification: NotificationItem
}

function NotificationCard({ notification }: NotificationCardProps) {
  const typeConfig = {
    message: {
      icon: MessageIcon,
      color: 'accent-primary',
      bgColor: 'bg-accent-primary/5',
    },
    watched_update: {
      icon: EyeIcon,
      color: 'semantic-info',
      bgColor: 'bg-semantic-info/5',
    },
    task_due: {
      icon: AlertIcon,
      color: 'semantic-critical',
      bgColor: 'bg-semantic-critical/5',
    },
    task_assigned: {
      icon: TaskIcon,
      color: 'semantic-warning',
      bgColor: 'bg-semantic-warning/5',
    },
  }

  const config = typeConfig[notification.type]
  const Icon = config.icon

  return (
    <Link
      href={notification.link}
      className={`block p-sm rounded-sm border border-divider hover:border-accent-primary transition-colors ${
        notification.read ? 'bg-white' : config.bgColor
      }`}
    >
      <div className="flex items-start gap-sm">
        <Icon className={`w-4 h-4 mt-0.5 text-${config.color} flex-shrink-0`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-sm">
            <p
              className={`text-meta truncate ${
                notification.read ? 'text-text-secondary' : 'text-text-primary font-medium'
              }`}
            >
              {notification.title}
            </p>
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-accent-primary flex-shrink-0" />
            )}
          </div>

          {notification.preview && (
            <p className="text-caption text-text-secondary truncate mt-xs">
              {notification.preview}
            </p>
          )}

          <div className="flex items-center gap-sm mt-xs text-caption text-text-secondary">
            <span>{notification.caseName}</span>
            <span>·</span>
            <span>{formatDate(notification.timestamp)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ============================================================================
// ICONS
// ============================================================================

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  )
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  )
}

function TaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  )
}
