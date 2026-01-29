import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/watches/available-scopes - Get scopes available for watching
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

    // Get all scopes that have events in this case
    const scopesWithEvents = await prisma.event.findMany({
      where: {
        caseId,
        deletedAt: null,
      },
      select: {
        scopeId: true,
      } as any,
      distinct: ['scopeId'] as any,
    } as any)

    const scopeIds = scopesWithEvents.map((e: any) => e.scopeId).filter((id): id is string => id !== null)

    const scopes = await prisma.scope.findMany({
      where: {
        id: { in: scopeIds },
      },
      orderBy: { code: 'asc' },
    })

    return NextResponse.json(scopes)
  } catch (error) {
    console.error('Failed to get available scopes:', error)
    return NextResponse.json(
      { error: 'Failed to get available scopes' },
      { status: 500 }
    )
  }
}
