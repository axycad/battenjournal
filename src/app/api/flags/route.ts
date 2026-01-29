import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/flags - Get flags for a case
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('caseId')
    const includeResolved = searchParams.get('includeResolved') === 'true'

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

    const flags = await prisma.flag.findMany({
      where: {
        caseId,
        deletedAt: null,
        ...(includeResolved ? {} : { resolvedAt: null }),
      },
      include: {
        raisedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(flags)
  } catch (error) {
    console.error('Failed to get flags:', error)
    return NextResponse.json(
      { error: 'Failed to get flags' },
      { status: 500 }
    )
  }
}
