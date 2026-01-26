'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationCounts {
  unreadMessages: number
  watchedUpdates: number
  overdueTasks: number
  pendingTasks: number
}

export interface CaseNotificationCounts {
  caseId: string
  caseName: string
  unreadMessages: number
  watchedUpdates: number
  overdueTasks: number
}

export interface NotificationItem {
  id: string
  type: 'message' | 'watched_update' | 'task_due' | 'task_assigned'
  caseId: string
  caseName: string
  title: string
  preview: string | null
  timestamp: Date
  link: string
  read: boolean
}

// ============================================================================
// GET NOTIFICATION COUNTS
// ============================================================================

export async function getNotificationCounts(): Promise<NotificationCounts> {
  const session = await auth()
  if (!session?.user?.id) {
    return { unreadMessages: 0, watchedUpdates: 0, overdueTasks: 0, pendingTasks: 0 }
  }

  const userId = session.user.id

  // Get user's memberships
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      revokedAt: null,
      deletedAt: null,
    },
    select: { id: true, caseId: true, memberType: true },
  })

  if (memberships.length === 0) {
    return { unreadMessages: 0, watchedUpdates: 0, overdueTasks: 0, pendingTasks: 0 }
  }

  const caseIds = memberships.map((m) => m.caseId)
  const membershipIds = memberships.map((m) => m.id)
  const isClinician = memberships.some((m) => m.memberType === 'CARE_TEAM')

  // Count unread messages across all cases
  const threads = await prisma.thread.findMany({
    where: {
      caseId: { in: caseIds },
      deletedAt: null,
    },
    select: { id: true },
  })

  const threadIds = threads.map((t) => t.id)

  let unreadMessages = 0
  if (threadIds.length > 0) {
    const reads = await prisma.threadRead.findMany({
      where: {
        threadId: { in: threadIds },
        userId,
      },
      select: { threadId: true, lastReadAt: true },
    })

    const readMap = new Map(reads.map((r) => [r.threadId, r.lastReadAt]))

    for (const threadId of threadIds) {
      const lastRead = readMap.get(threadId)
      const count = await prisma.message.count({
        where: {
          threadId,
          deletedAt: null,
          authorUserId: { not: userId },
          ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
        },
      })
      unreadMessages += count
    }
  }

  // Count watched updates (for clinicians)
  let watchedUpdates = 0
  if (isClinician) {
    const watches = await prisma.watch.findMany({
      where: {
        membershipId: { in: membershipIds },
        removedAt: null,
        deletedAt: null,
      },
      select: { scopeId: true, caseId: true, createdAt: true },
    })

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    for (const watch of watches) {
      const count = await prisma.event.count({
        where: {
          caseId: watch.caseId,
          deletedAt: null,
          createdAt: { gt: sevenDaysAgo },
          scopes: {
            some: { scopeId: watch.scopeId },
          },
        },
      })
      watchedUpdates += count
    }
  }

  // Count overdue and pending tasks (for clinicians)
  let overdueTasks = 0
  let pendingTasks = 0
  if (isClinician) {
    const now = new Date()

    const tasks = await prisma.task.findMany({
      where: {
        assignedToId: userId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        deletedAt: null,
      },
      select: { dueAt: true },
    })

    for (const task of tasks) {
      if (task.dueAt && task.dueAt < now) {
        overdueTasks++
      } else {
        pendingTasks++
      }
    }
  }

  return { unreadMessages, watchedUpdates, overdueTasks, pendingTasks }
}

// ============================================================================
// GET NOTIFICATION COUNTS PER CASE
// ============================================================================

export async function getNotificationCountsPerCase(): Promise<CaseNotificationCounts[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const userId = session.user.id

  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      revokedAt: null,
      deletedAt: null,
    },
    include: {
      case: {
        select: { id: true, childDisplayName: true },
      },
    },
  })

  const results: CaseNotificationCounts[] = []

  for (const membership of memberships) {
    const caseId = membership.caseId
    const isClinician = membership.memberType === 'CARE_TEAM'

    // Unread messages for this case
    const threads = await prisma.thread.findMany({
      where: { caseId, deletedAt: null },
      select: { id: true },
    })

    let unreadMessages = 0
    for (const thread of threads) {
      const read = await prisma.threadRead.findUnique({
        where: {
          threadId_userId: { threadId: thread.id, userId },
        },
        select: { lastReadAt: true },
      })

      const count = await prisma.message.count({
        where: {
          threadId: thread.id,
          deletedAt: null,
          authorUserId: { not: userId },
          ...(read?.lastReadAt ? { createdAt: { gt: read.lastReadAt } } : {}),
        },
      })
      unreadMessages += count
    }

    // Watched updates for this case (clinicians only)
    let watchedUpdates = 0
    if (isClinician) {
      const watches = await prisma.watch.findMany({
        where: {
          membershipId: membership.id,
          caseId,
          removedAt: null,
          deletedAt: null,
        },
        select: { scopeId: true, createdAt: true },
      })

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      for (const watch of watches) {
        const count = await prisma.event.count({
          where: {
            caseId,
            deletedAt: null,
            createdAt: { gt: sevenDaysAgo },
            scopes: {
              some: { scopeId: watch.scopeId },
            },
          },
        })
        watchedUpdates += count
      }
    }

    // Overdue tasks for this case (clinicians only)
    let overdueTasks = 0
    if (isClinician) {
      const now = new Date()
      overdueTasks = await prisma.task.count({
        where: {
          caseId,
          assignedToId: userId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          dueAt: { lt: now },
          deletedAt: null,
        },
      })
    }

    if (unreadMessages > 0 || watchedUpdates > 0 || overdueTasks > 0) {
      results.push({
        caseId,
        caseName: membership.case.childDisplayName,
        unreadMessages,
        watchedUpdates,
        overdueTasks,
      })
    }
  }

  return results
}

// ============================================================================
// GET RECENT NOTIFICATIONS
// ============================================================================

export async function getRecentNotifications(limit = 20): Promise<NotificationItem[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const userId = session.user.id
  const notifications: NotificationItem[] = []

  // Get user's memberships
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      revokedAt: null,
      deletedAt: null,
    },
    include: {
      case: { select: { id: true, childDisplayName: true } },
    },
  })

  const caseMap = new Map(memberships.map((m) => [m.caseId, m.case.childDisplayName]))
  const membershipMap = new Map(memberships.map((m) => [m.caseId, m]))

  // Recent messages (not from self)
  const recentMessages = await prisma.message.findMany({
    where: {
      thread: {
        caseId: { in: [...caseMap.keys()] },
        deletedAt: null,
      },
      authorUserId: { not: userId },
      deletedAt: null,
    },
    include: {
      thread: { select: { id: true, caseId: true, subject: true } },
      author: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  // Get read timestamps for these threads
  const threadIds = [...new Set(recentMessages.map((m) => m.threadId))]
  const reads = await prisma.threadRead.findMany({
    where: { threadId: { in: threadIds }, userId },
    select: { threadId: true, lastReadAt: true },
  })
  const readMap = new Map(reads.map((r) => [r.threadId, r.lastReadAt]))

  for (const message of recentMessages) {
    const lastRead = readMap.get(message.threadId)
    const isRead = lastRead ? message.createdAt <= lastRead : false

    notifications.push({
      id: `msg-${message.id}`,
      type: 'message',
      caseId: message.thread.caseId,
      caseName: caseMap.get(message.thread.caseId) || 'Unknown',
      title: `New message from ${message.author.name || 'Someone'}`,
      preview: message.content.slice(0, 100),
      timestamp: message.createdAt,
      link: `/case/${message.thread.caseId}/messages/${message.threadId}`,
      read: isRead,
    })
  }

  // Recent task assignments (for clinicians)
  const clinicianMemberships = memberships.filter((m) => m.memberType === 'CARE_TEAM')
  if (clinicianMemberships.length > 0) {
    const recentTasks = await prisma.task.findMany({
      where: {
        assignedToId: userId,
        deletedAt: null,
      },
      include: {
        case: { select: { id: true, childDisplayName: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    for (const task of recentTasks) {
      const isOverdue = task.dueAt && task.dueAt < new Date() && task.status !== 'DONE'

      notifications.push({
        id: `task-${task.id}`,
        type: isOverdue ? 'task_due' : 'task_assigned',
        caseId: task.caseId,
        caseName: task.case.childDisplayName,
        title: isOverdue ? `Overdue: ${task.title}` : `Task assigned: ${task.title}`,
        preview: task.description?.slice(0, 100) || null,
        timestamp: task.createdAt,
        link: `/case/${task.caseId}/clinical`,
        read: task.status === 'DONE' || task.status === 'CANCELED',
      })
    }
  }

  // Sort by timestamp and limit
  notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  return notifications.slice(0, limit)
}

// ============================================================================
// GET SYNC STATUS (Client-side only, returns shape for server rendering)
// ============================================================================

export interface SyncStatus {
  pendingCount: number
  failedCount: number
  conflictCount: number
  lastSyncAt: Date | null
  isOnline: boolean
}

// Note: Actual sync status is client-side only (IndexedDB)
// This provides the shape for components
export async function getSyncStatusShape(): Promise<SyncStatus> {
  return {
    pendingCount: 0,
    failedCount: 0,
    conflictCount: 0,
    lastSyncAt: null,
    isOnline: true,
  }
}
