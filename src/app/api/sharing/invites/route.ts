import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/sharing/invites - Get pending clinician invites for a case
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

    // Verify access (OWNER_ADMIN only)
    const membership = await prisma.membership.findFirst({
      where: {
        caseId,
        userId: session.user.id,
        familyRole: 'OWNER_ADMIN',
        revokedAt: null,
        deletedAt: null,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied - admin only' },
        { status: 403 }
      )
    }

    const invites = await prisma.invite.findMany({
      where: {
        caseId,
        status: 'PENDING' as any,
        deletedAt: null,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
          },
        } as any,
      },
      orderBy: { createdAt: 'desc' },
    } as any)

    return NextResponse.json(invites)
  } catch (error) {
    console.error('Failed to get pending clinician invites:', error)
    return NextResponse.json(
      { error: 'Failed to get invites' },
      { status: 500 }
    )
  }
}
