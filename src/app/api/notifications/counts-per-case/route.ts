import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json([], { status: 200 })
  }

  try {
    const userId = session.user.id

    // Get user's memberships
    const memberships = await prisma.membership.findMany({
      where: {
        userId,
        revokedAt: null,
        deletedAt: null,
      },
      include: {
        case: {
          select: {
            id: true,
            childDisplayName: true,
          },
        },
      },
    })

    if (memberships.length === 0) {
      return NextResponse.json([])
    }

    const results = []

    for (const membership of memberships) {
      const caseId = membership.case.id

      // Count unread messages in this case
      const threads = await prisma.thread.findMany({
        where: {
          caseId,
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
            userId: userId,
          },
        })

        const readMap = new Map(reads.map((r) => [r.threadId, r]))

        for (const thread of threads) {
          const read = readMap.get(thread.id)
          if (!read) {
            unreadMessages += 1
          }
        }
      }

      // Count watched updates (events user created with replies)
      const events = await prisma.event.findMany({
        where: {
          caseId,
          deletedAt: null,
          authorUserId: userId,
        },
        select: { id: true },
      })

      const eventIds = events.map((e) => e.id)

      let watchedUpdates = 0
      if (eventIds.length > 0) {
        watchedUpdates = await prisma.message.count({
          where: {
            thread: {
              anchorType: 'EVENT',
              anchorId: { in: eventIds },
              deletedAt: null,
            },
            authorUserId: { not: userId },
            deletedAt: null,
          },
        })
      }

      // Count overdue tasks for this case
      let overdueTasks = 0
      if (membership.memberType === 'CARE_TEAM') {
        const now = new Date()

        overdueTasks = await prisma.task.count({
          where: {
            caseId,
            assignedToId: userId,
            status: { notIn: ['DONE', 'CANCELED'] },
            dueAt: { lt: now },
            deletedAt: null,
          },
        })
      }

      // Only include cases with notifications
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

    return NextResponse.json(results)
  } catch (error) {
    console.error('Failed to get notification counts per case:', error)
    return NextResponse.json(
      { error: 'Failed to get notification counts per case' },
      { status: 500 }
    )
  }
}
