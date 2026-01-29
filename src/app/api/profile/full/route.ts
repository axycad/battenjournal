import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/profile/full - Get full profile data for a case
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

    // Get full profile data
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        profile: true,
        careIntent: true,
        allergies: {
          where: { deletedAt: null },
          orderBy: [
            { severity: 'desc' },
            { createdAt: 'desc' },
          ],
        },
        medications: {
          where: { deletedAt: null, active: true },
          orderBy: { createdAt: 'desc' },
        },
        conditions: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        careContacts: {
          where: { deletedAt: null },
          orderBy: { role: 'asc' },
        },
      },
    })

    if (!caseData) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(caseData)
  } catch (error) {
    console.error('Failed to get full profile:', error)
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    )
  }
}
