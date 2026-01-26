'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = void> = {
  success: boolean
  error?: string
  data?: T
}

// ============================================================================
// TYPES
// ============================================================================

export type DigestFrequency = 'OFF' | 'IMMEDIATE' | 'DAILY' | 'WEEKLY'

export interface EmailPreferences {
  digestFrequency: DigestFrequency
  watchAlerts: boolean
  taskReminders: boolean
  messageNotifications: boolean
}

export interface PendingDigestItem {
  type: 'message' | 'watch' | 'task'
  caseId: string
  caseName: string
  title: string
  preview: string | null
  timestamp: Date
  link: string
}

// ============================================================================
// GET EMAIL PREFERENCES
// ============================================================================

export async function getEmailPreferences(): Promise<EmailPreferences | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const prefs = await prisma.emailPreference.findUnique({
    where: { userId: session.user.id },
  })

  if (!prefs) {
    // Return defaults
    return {
      digestFrequency: 'DAILY',
      watchAlerts: true,
      taskReminders: true,
      messageNotifications: true,
    }
  }

  return {
    digestFrequency: prefs.digestFrequency,
    watchAlerts: prefs.watchAlerts,
    taskReminders: prefs.taskReminders,
    messageNotifications: prefs.messageNotifications,
  }
}

// ============================================================================
// UPDATE EMAIL PREFERENCES
// ============================================================================

export async function updateEmailPreferences(
  prefs: Partial<EmailPreferences>
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  await prisma.emailPreference.upsert({
    where: { userId: session.user.id },
    update: {
      ...(prefs.digestFrequency !== undefined && { digestFrequency: prefs.digestFrequency }),
      ...(prefs.watchAlerts !== undefined && { watchAlerts: prefs.watchAlerts }),
      ...(prefs.taskReminders !== undefined && { taskReminders: prefs.taskReminders }),
      ...(prefs.messageNotifications !== undefined && { messageNotifications: prefs.messageNotifications }),
    },
    create: {
      userId: session.user.id,
      digestFrequency: prefs.digestFrequency || 'DAILY',
      watchAlerts: prefs.watchAlerts ?? true,
      taskReminders: prefs.taskReminders ?? true,
      messageNotifications: prefs.messageNotifications ?? true,
    },
  })

  revalidatePath('/settings')
  return { success: true }
}

// ============================================================================
// UNSUBSCRIBE
// ============================================================================

export async function unsubscribeByToken(token: string): Promise<ActionResult> {
  const prefs = await prisma.emailPreference.findUnique({
    where: { unsubscribeToken: token },
  })

  if (!prefs) {
    return { success: false, error: 'Invalid unsubscribe link' }
  }

  await prisma.emailPreference.update({
    where: { id: prefs.id },
    data: { digestFrequency: 'OFF' },
  })

  return { success: true }
}

export async function getUnsubscribeToken(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const prefs = await prisma.emailPreference.findUnique({
    where: { userId: session.user.id },
    select: { unsubscribeToken: true },
  })

  return prefs?.unsubscribeToken || null
}

// ============================================================================
// GET PENDING DIGEST ITEMS
// ============================================================================

export async function getPendingDigestItems(
  userId: string,
  since: Date
): Promise<PendingDigestItem[]> {
  const items: PendingDigestItem[] = []

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
  const caseIds = Array.from(caseMap.keys())

  // Get user's email preferences
  const prefs = await prisma.emailPreference.findUnique({
    where: { userId },
  })

  // New messages
  if (prefs?.messageNotifications !== false) {
    const threads = await prisma.thread.findMany({
      where: { caseId: { in: caseIds }, deletedAt: null },
      select: { id: true, caseId: true, subject: true },
    })

    for (const thread of threads) {
      const read = await prisma.threadRead.findUnique({
        where: { threadId_userId: { threadId: thread.id, userId } },
        select: { lastReadAt: true },
      })

      const messages = await prisma.message.findMany({
        where: {
          threadId: thread.id,
          deletedAt: null,
          authorUserId: { not: userId },
          createdAt: { gt: since },
          ...(read?.lastReadAt ? { createdAt: { gt: read.lastReadAt } } : {}),
        },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      })

      if (messages.length > 0) {
        const msg = messages[0]
        items.push({
          type: 'message',
          caseId: thread.caseId,
          caseName: caseMap.get(thread.caseId) || 'Unknown',
          title: `New message from ${msg.author.name || 'Someone'}`,
          preview: msg.content.slice(0, 100),
          timestamp: msg.createdAt,
          link: `/case/${thread.caseId}/messages/${thread.id}`,
        })
      }
    }
  }

  // Watched updates (for clinicians)
  if (prefs?.watchAlerts !== false) {
    const clinicianMemberships = memberships.filter((m) => m.memberType === 'CARE_TEAM')

    for (const membership of clinicianMemberships) {
      const watches = await prisma.watch.findMany({
        where: {
          membershipId: membership.id,
          removedAt: null,
          deletedAt: null,
        },
        include: { scope: { select: { label: true } } },
      })

      for (const watch of watches) {
        const events = await prisma.event.findMany({
          where: {
            caseId: membership.caseId,
            deletedAt: null,
            createdAt: { gt: since },
            scopes: { some: { scopeId: watch.scopeId } },
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
        })

        if (events.length > 0) {
          items.push({
            type: 'watch',
            caseId: membership.caseId,
            caseName: membership.case.childDisplayName,
            title: `${events.length} new ${watch.scope.label} update${events.length !== 1 ? 's' : ''}`,
            preview: null,
            timestamp: events[0].createdAt,
            link: `/case/${membership.caseId}/today`,
          })
        }
      }
    }
  }

  // Task reminders (for clinicians)
  if (prefs?.taskReminders !== false) {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const tasks = await prisma.task.findMany({
      where: {
        assignedToId: userId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        deletedAt: null,
        dueAt: { lte: tomorrow },
      },
      include: {
        case: { select: { id: true, childDisplayName: true } },
      },
    })

    for (const task of tasks) {
      const isOverdue = task.dueAt && task.dueAt < now

      items.push({
        type: 'task',
        caseId: task.caseId,
        caseName: task.case.childDisplayName,
        title: isOverdue ? `Overdue: ${task.title}` : `Due soon: ${task.title}`,
        preview: task.description?.slice(0, 100) || null,
        timestamp: task.dueAt || task.createdAt,
        link: `/case/${task.caseId}/clinical`,
      })
    }
  }

  // Sort by timestamp
  items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  return items
}

// ============================================================================
// SEND DIGEST (Called by cron job)
// ============================================================================

export async function generateDigestEmail(
  userId: string
): Promise<{ subject: string; html: string; text: string } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })

  if (!user) return null

  const prefs = await prisma.emailPreference.findUnique({
    where: { userId },
  })

  if (!prefs || prefs.digestFrequency === 'OFF') return null

  // Calculate "since" based on frequency
  const since = new Date()
  if (prefs.digestFrequency === 'DAILY') {
    since.setDate(since.getDate() - 1)
  } else if (prefs.digestFrequency === 'WEEKLY') {
    since.setDate(since.getDate() - 7)
  } else if (prefs.digestFrequency === 'IMMEDIATE') {
    // For immediate, use last digest sent time or 1 hour ago
    if (prefs.lastDigestSentAt) {
      since.setTime(prefs.lastDigestSentAt.getTime())
    } else {
      since.setHours(since.getHours() - 1)
    }
  }

  const items = await getPendingDigestItems(userId, since)

  if (items.length === 0) return null

  const baseUrl = process.env.AUTH_URL || 'http://localhost:5000'

  // Build email content
  const subject = `Batten Journal: ${items.length} update${items.length !== 1 ? 's' : ''}`

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
          <p style="margin: 0 0 4px; font-weight: 500; color: #1a1a1a;">
            ${escapeHtml(item.title)}
          </p>
          <p style="margin: 0 0 4px; font-size: 14px; color: #666;">
            ${escapeHtml(item.caseName)}
          </p>
          ${item.preview ? `<p style="margin: 0; font-size: 14px; color: #888;">${escapeHtml(item.preview)}</p>` : ''}
          <a href="${baseUrl}${item.link}" style="display: inline-block; margin-top: 8px; font-size: 14px; color: #2563eb;">
            View →
          </a>
        </td>
      </tr>
    `
    )
    .join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #1a1a1a; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 24px;">
          Hi ${escapeHtml(user.name || 'there')},
        </h1>
        
        <p style="margin: 0 0 24px; color: #666;">
          Here's what's new in Batten Journal:
        </p>
        
        <table style="width: 100%; border-collapse: collapse;">
          ${itemsHtml}
        </table>
        
        <p style="margin: 32px 0 0; font-size: 14px; color: #888;">
          <a href="${baseUrl}/settings/notifications" style="color: #2563eb;">Manage email preferences</a>
          &nbsp;·&nbsp;
          <a href="${baseUrl}/unsubscribe/${prefs.unsubscribeToken}" style="color: #888;">Unsubscribe</a>
        </p>
      </div>
    </body>
    </html>
  `

  const itemsText = items
    .map((item) => `${item.title}\n${item.caseName}\n${item.preview || ''}\n${baseUrl}${item.link}`)
    .join('\n\n')

  const text = `Hi ${user.name || 'there'},

Here's what's new in Batten Journal:

${itemsText}

---
Manage email preferences: ${baseUrl}/settings/notifications
Unsubscribe: ${baseUrl}/unsubscribe/${prefs.unsubscribeToken}
`

  return { subject, html, text }
}

// ============================================================================
// MARK DIGEST SENT
// ============================================================================

export async function markDigestSent(userId: string): Promise<void> {
  await prisma.emailPreference.update({
    where: { userId },
    data: { lastDigestSentAt: new Date() },
  })
}

// ============================================================================
// GET USERS DUE FOR DIGEST
// ============================================================================

export async function getUsersDueForDigest(
  frequency: DigestFrequency
): Promise<string[]> {
  const now = new Date()

  let maxLastSent: Date
  if (frequency === 'IMMEDIATE') {
    maxLastSent = new Date(now.getTime() - 60 * 60 * 1000) // 1 hour ago
  } else if (frequency === 'DAILY') {
    maxLastSent = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago
  } else if (frequency === 'WEEKLY') {
    maxLastSent = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
  } else {
    return []
  }

  const prefs = await prisma.emailPreference.findMany({
    where: {
      digestFrequency: frequency,
      OR: [
        { lastDigestSentAt: null },
        { lastDigestSentAt: { lt: maxLastSent } },
      ],
    },
    select: { userId: true },
  })

  return prefs.map((p) => p.userId)
}

// ============================================================================
// HELPERS
// ============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
