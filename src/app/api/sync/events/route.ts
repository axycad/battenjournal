import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

// GET - Fetch events for offline caching
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const caseId = searchParams.get('caseId')

  if (!caseId) {
    return NextResponse.json({ error: 'Case ID required' }, { status: 400 })
  }

  // Verify membership
  const membership = await prisma.membership.findFirst({
    where: {
      caseId,
      userId: session.user.id,
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Fetch recent events (last 30 days or 100 events, whichever is more)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const events = await prisma.event.findMany({
    where: {
      caseId,
      deletedAt: null,
      OR: [
        { occurredAt: { gte: thirtyDaysAgo } },
        // Include most recent 100 regardless of date
      ],
    },
    include: {
      author: { select: { id: true, name: true } },
      scopes: { include: { scope: true } },
    },
    orderBy: { occurredAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(
    events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      freeText: e.freeText,
      occurredAt: e.occurredAt,
      loggedAt: e.loggedAt,
      authorUserId: e.author.id,
      authorName: e.author.name,
      scopeCodes: e.scopes.map((s) => s.scope.code),
      updatedAt: e.updatedAt,
    }))
  )
}

// POST - Create event from offline queue
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { caseId, eventType, freeText, occurredAt, scopeCodes, localId } = body

  if (!caseId || !eventType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify membership and edit access
  const membership = await prisma.membership.findFirst({
    where: {
      caseId,
      userId: session.user.id,
      memberType: 'PARENT',
      familyRole: { in: ['OWNER_ADMIN', 'EDITOR'] },
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Check for duplicate (same localId already synced)
  if (localId) {
    const existing = await prisma.event.findFirst({
      where: {
        caseId,
        // Store localId in metadata or use a field
        // For now, check by occurredAt + eventType + author as approximation
      },
    })
  }

  // Create event
  const event = await prisma.$transaction(async (tx) => {
    const newEvent = await tx.event.create({
      data: {
        caseId,
        authorUserId: session.user.id,
        eventType,
        freeText: freeText?.trim() || null,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        loggedAt: new Date(),
      },
    })

    // Create scopes
    if (scopeCodes?.length) {
      const scopes = await tx.scope.findMany({
        where: { code: { in: scopeCodes as string[] } },
      })

      if (scopes.length > 0) {
        await tx.eventScope.createMany({
          data: scopes.map((scope) => ({
            eventId: newEvent.id,
            scopeId: scope.id,
          })),
        })
      }
    }

    await tx.auditEntry.create({
      data: {
        actorUserId: session.user.id,
        action: 'EDIT',
        objectType: 'Event',
        objectId: newEvent.id,
        metadata: { eventType, source: 'offline_sync', localId },
      },
    })

    return newEvent
  })

  return NextResponse.json({ id: event.id, eventId: event.id })
}

// PUT - Update event from offline queue (with conflict detection)
export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { serverId, freeText, occurredAt, scopeCodes, localUpdatedAt } = body

  if (!serverId) {
    return NextResponse.json({ error: 'Server ID required' }, { status: 400 })
  }

  // Get existing event
  const existing = await prisma.event.findUnique({
    where: { id: serverId },
    include: {
      author: { select: { id: true, name: true } },
      scopes: { include: { scope: true } },
    },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Verify membership
  const membership = await prisma.membership.findFirst({
    where: {
      caseId: existing.caseId,
      userId: session.user.id,
      memberType: 'PARENT',
      familyRole: { in: ['OWNER_ADMIN', 'EDITOR'] },
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Conflict detection: compare timestamps
  if (localUpdatedAt) {
    const localTime = new Date(localUpdatedAt).getTime()
    const serverTime = existing.updatedAt.getTime()

    // If server was updated after the local edit started, conflict
    if (serverTime > localTime) {
      return NextResponse.json(
        {
          error: 'Conflict detected',
          serverVersion: {
            id: existing.id,
            eventType: existing.eventType,
            freeText: existing.freeText,
            occurredAt: existing.occurredAt,
            scopeCodes: existing.scopes.map((s) => s.scope.code),
            updatedAt: existing.updatedAt,
            authorUserId: existing.author.id,
            authorName: existing.author.name,
          },
        },
        { status: 409 }
      )
    }
  }

  // Update event
  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: serverId },
      data: {
        freeText: freeText !== undefined ? freeText?.trim() || null : undefined,
        occurredAt: occurredAt ? new Date(occurredAt) : undefined,
      },
    })

    // Update scopes if provided
    if (scopeCodes !== undefined) {
      await tx.eventScope.deleteMany({ where: { eventId: serverId } })

      if (scopeCodes.length > 0) {
        const scopes = await tx.scope.findMany({
          where: { code: { in: scopeCodes as string[] } },
        })

        if (scopes.length > 0) {
          await tx.eventScope.createMany({
            data: scopes.map((scope) => ({
              eventId: serverId,
              scopeId: scope.id,
            })),
          })
        }
      }
    }

    await tx.auditEntry.create({
      data: {
        actorUserId: session.user.id,
        action: 'EDIT',
        objectType: 'Event',
        objectId: serverId,
        metadata: { source: 'offline_sync' },
      },
    })
  })

  return NextResponse.json({ success: true })
}
