import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/medications/history - Get administration history for a case
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('caseId')
    const limit = searchParams.get('limit')

    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID required' },
        { status: 400 }
      )
    }

    // Verify access (parents only)
    const membership = await prisma.membership.findFirst({
      where: {
        caseId,
        userId: session.user.id,
        memberType: 'PARENT',
        revokedAt: null,
        deletedAt: null,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied - parents only' },
        { status: 403 }
      )
    }

    const history = await prisma.medicationAdministration.findMany({
      where: {
        medication: {
          caseId,
          deletedAt: null,
        },
        deletedAt: null,
      },
      include: {
        medication: {
          select: {
            id: true,
            name: true,
            dose: true,
          },
        },
        administeredBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { administeredAt: 'desc' },
      take: limit ? parseInt(limit) : 20,
    })

    return NextResponse.json(history)
  } catch (error) {
    console.error('Failed to get administration history:', error)
    return NextResponse.json(
      { error: 'Failed to get history' },
      { status: 500 }
    )
  }
}
