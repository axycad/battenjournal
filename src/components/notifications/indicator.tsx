'use client'

import {Link} from '@/navigation'
import { NotificationBadge } from './badge'
import type { NotificationCounts, CaseNotificationCounts } from '@/actions/notifications'

// ============================================================================
// GLOBAL NOTIFICATION INDICATOR
// ============================================================================

interface NotificationIndicatorProps {
  counts: NotificationCounts
}

export function NotificationIndicator({ counts }: NotificationIndicatorProps) {
  const total =
    counts.unreadMessages + counts.watchedUpdates + counts.overdueTasks

  if (total === 0) return null

  return (
    <Link
      href="/notifications"
      className="relative p-2 text-text-secondary hover:text-text-primary transition-colors"
      aria-label={`${total} notifications`}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <NotificationBadge
        count={total}
        variant={counts.overdueTasks > 0 ? 'critical' : 'default'}
        className="absolute -top-0.5 -right-0.5"
      />
    </Link>
  )
}

// ============================================================================
// CASE NOTIFICATION BADGES
// ============================================================================

interface CaseNotificationBadgesProps {
  counts: CaseNotificationCounts
  compact?: boolean
}

export function CaseNotificationBadges({
  counts,
  compact = false,
}: CaseNotificationBadgesProps) {
  const { unreadMessages, watchedUpdates, overdueTasks } = counts

  if (unreadMessages === 0 && watchedUpdates === 0 && overdueTasks === 0) {
    return null
  }

  if (compact) {
    const total = unreadMessages + watchedUpdates + overdueTasks
    return (
      <NotificationBadge
        count={total}
        variant={overdueTasks > 0 ? 'critical' : 'default'}
      />
    )
  }

  return (
    <div className="flex items-center gap-xs">
      {unreadMessages > 0 && (
        <span className="inline-flex items-center gap-0.5 px-xs py-0.5 text-[11px] bg-accent-primary/10 text-accent-primary rounded">
          <MessageIcon className="w-3 h-3" />
          {unreadMessages}
        </span>
      )}
      {watchedUpdates > 0 && (
        <span className="inline-flex items-center gap-0.5 px-xs py-0.5 text-[11px] bg-semantic-info/10 text-semantic-info rounded">
          <EyeIcon className="w-3 h-3" />
          {watchedUpdates}
        </span>
      )}
      {overdueTasks > 0 && (
        <span className="inline-flex items-center gap-0.5 px-xs py-0.5 text-[11px] bg-semantic-critical/10 text-semantic-critical rounded">
          <AlertIcon className="w-3 h-3" />
          {overdueTasks}
        </span>
      )}
    </div>
  )
}

// ============================================================================
// NOTIFICATION TYPE SUMMARY
// ============================================================================

interface NotificationSummaryProps {
  counts: NotificationCounts
  showLabels?: boolean
}

export function NotificationSummary({ counts, showLabels = true }: NotificationSummaryProps) {
  const items = [
    {
      label: 'Unread messages',
      count: counts.unreadMessages,
      icon: MessageIcon,
      color: 'accent-primary',
      link: '/notifications?type=message',
    },
    {
      label: 'Watched updates',
      count: counts.watchedUpdates,
      icon: EyeIcon,
      color: 'semantic-info',
      link: '/notifications?type=watch',
    },
    {
      label: 'Overdue tasks',
      count: counts.overdueTasks,
      icon: AlertIcon,
      color: 'semantic-critical',
      link: '/notifications?type=task',
    },
    {
      label: 'Pending tasks',
      count: counts.pendingTasks,
      icon: TaskIcon,
      color: 'semantic-warning',
      link: '/notifications?type=task',
    },
  ].filter((item) => item.count > 0)

  if (items.length === 0) {
    return (
      <p className="text-meta text-text-secondary">No new notifications</p>
    )
  }

  return (
    <div className="space-y-xs">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.link}
          className="flex items-center justify-between p-sm bg-bg-primary rounded-sm hover:bg-bg-secondary transition-colors"
        >
          <div className="flex items-center gap-sm">
            <item.icon className={`w-4 h-4 text-${item.color}`} />
            {showLabels && (
              <span className="text-meta text-text-primary">{item.label}</span>
            )}
          </div>
          <NotificationBadge
            count={item.count}
            variant={item.color === 'semantic-critical' ? 'critical' : 'default'}
          />
        </Link>
      ))}
    </div>
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
