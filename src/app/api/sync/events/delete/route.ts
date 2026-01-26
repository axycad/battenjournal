import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE - Delete event from offline queue
export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { serverId } = body

  if (!serverId) {
    return NextResponse.json({ error: 'Server ID required' }, { status: 400 })
  }

  // Get existing event
  const existing = await prisma.event.findUnique({
    where: { id: serverId },
  })

  if (!existing) {
    // Already deleted, success
    return NextResponse.json({ success: true })
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

  // Soft delete
  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: serverId },
      data: { deletedAt: new Date() },
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: session.user.id,
        action: 'DELETE',
        objectType: 'Event',
        objectId: serverId,
        metadata: { source: 'offline_sync' },
      },
    })
  })

  return NextResponse.json({ success: true })
}

// Also support POST for clients that don't support DELETE with body
export async function POST(request: NextRequest) {
  return DELETE(request)
}
