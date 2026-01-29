import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/clinicians - Get clinicians for a case
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

    const clinicians = await prisma.membership.findMany({
      where: {
        caseId,
        memberType: 'CARE_TEAM',
        revokedAt: null,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    })

    return NextResponse.json(clinicians)
  } catch (error) {
    console.error('Failed to get clinicians:', error)
    return NextResponse.json(
      { error: 'Failed to get clinicians' },
      { status: 500 }
    )
  }
}
