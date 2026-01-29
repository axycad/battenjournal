import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/messages/threads - Get threads for a case
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('caseId')

    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID required' },
        { status: 400 }
      )
    }

    // Verify access
    const membership = await prisma.membership.findFirst({
      where: {
        caseId,
        userId: session.user.id,
        revokedAt: null,
        deletedAt: null,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const threads = await prisma.thread.findMany({
      where: {
        caseId,
        deletedAt: null,
        OR: [
          { participants: { some: { userId: session.user.id } } },
          { createdById: session.user.id },
          { participants: { none: {} } },
        ],
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            createdAt: true,
          },
        },
        threadReads: {
          where: { userId: session.user.id },
          select: { lastReadAt: true },
        },
        _count: {
          select: {
            messages: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const participantIds = Array.from(
      new Set(threads.flatMap((t) => t.participants.map((p) => p.userId)))
    )
    const membershipMap = new Map<string, string>()

    if (participantIds.length > 0) {
      const memberships = await prisma.membership.findMany({
        where: {
          caseId,
          userId: { in: participantIds },
          revokedAt: null,
          deletedAt: null,
        },
        select: {
          userId: true,
          memberType: true,
        },
      })

      memberships.forEach((m) => {
        membershipMap.set(m.userId, m.memberType)
      })
    }

    const result = threads.map((thread) => ({
      ...thread,
      participants: thread.participants.map((p) => ({
        ...p,
        user: {
          ...p.user,
          memberType: membershipMap.get(p.userId) || 'UNKNOWN',
        },
      })),
      lastMessage: thread.messages[0] || null,
      lastReadAt: thread.threadReads[0]?.lastReadAt || null,
      messageCount: thread._count.messages,
      isUnread:
        thread.messages[0] &&
        (!thread.threadReads[0]?.lastReadAt ||
          new Date(thread.messages[0].createdAt) > new Date(thread.threadReads[0].lastReadAt)),
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to get threads:', error)
    return NextResponse.json(
      { error: 'Failed to get threads' },
      { status: 500 }
    )
  }
}
