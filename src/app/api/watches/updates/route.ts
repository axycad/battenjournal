import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/watches/updates - Get watched updates (new events matching user's watches)
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

    // Verify access (clinician only)
    const membership = await prisma.membership.findFirst({
      where: {
        caseId,
        userId: session.user.id,
        memberType: 'CARE_TEAM',
        revokedAt: null,
        deletedAt: null,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied - clinicians only' },
        { status: 403 }
      )
    }

    // Get user's watches for this case
    const watches = await prisma.watch.findMany({
      where: {
        caseId,
        userId: session.user.id,
        deletedAt: null,
      },
      select: {
        scopeId: true,
        lastViewedAt: true,
      },
    })

    if (watches.length === 0) {
      return NextResponse.json([])
    }

    // Build query to find new events matching watched scopes
    const watchedScopeIds = watches.map((w) => w.scopeId)
    const updates = await Promise.all(
      watches.map(async (watch) => {
        const newEvents = await prisma.event.findMany({
          where: {
            caseId,
            scopeId: watch.scopeId,
            occurredAt: { gt: watch.lastViewedAt },
            deletedAt: null,
          },
          orderBy: { occurredAt: 'desc' },
          take: 5,
          include: {
            scope: true,
          },
        })

        return {
          scopeId: watch.scopeId,
          lastViewedAt: watch.lastViewedAt,
          newEventCount: newEvents.length,
          recentEvents: newEvents,
        }
      })
    )

    return NextResponse.json(updates.filter((u) => u.newEventCount > 0))
  } catch (error) {
    console.error('Failed to get watched updates:', error)
    return NextResponse.json(
      { error: 'Failed to get watched updates' },
      { status: 500 }
    )
  }
}
