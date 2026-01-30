import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { unreadMessages: 0, watchedUpdates: 0, overdueTasks: 0, pendingTasks: 0 },
      { status: 200 }
    )
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
      select: { id: true, caseId: true, memberType: true },
    })

    if (memberships.length === 0) {
      return NextResponse.json({
        unreadMessages: 0,
        watchedUpdates: 0,
        overdueTasks: 0,
        pendingTasks: 0,
      })
    }

    const caseIds = memberships.map((m) => m.caseId)
    const membershipIds = memberships.map((m) => m.id)
    const isClinician = memberships.some((m) => m.memberType === 'CARE_TEAM')

    // Count unread messages
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

    // Count watched updates (parents watching events they created)
    let watchedUpdates = 0
    if (!isClinician) {
      const events = await prisma.event.findMany({
        where: {
          caseId: { in: caseIds },
          deletedAt: null,
          authorUserId: userId,
        },
        select: { id: true },
      })

      const eventIds = events.map((e) => e.id)

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
    }

    // Count tasks
    let overdueTasks = 0
    let pendingTasks = 0

    if (isClinician) {
      const now = new Date()

      const tasks = await prisma.task.findMany({
        where: {
          assignedToId: userId,
          status: { notIn: ['DONE', 'CANCELED'] },
          deletedAt: null,
        },
        select: { dueAt: true },
      })

      for (const task of tasks) {
        if (task.dueAt && task.dueAt < now) {
          overdueTasks += 1
        } else {
          pendingTasks += 1
        }
      }
    }

    return NextResponse.json({
      unreadMessages,
      watchedUpdates,
      overdueTasks,
      pendingTasks,
    })
  } catch (error) {
    console.error('Failed to get notification counts:', error)
    return NextResponse.json(
      { error: 'Failed to get notification counts' },
      { status: 500 }
    )
  }
}
