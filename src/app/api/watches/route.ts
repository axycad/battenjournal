import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

// GET /api/watches - Get watches for current user on a case
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

    const watches = await prisma.watch.findMany({
      where: {
        caseId,
        userId: session.user.id,
        deletedAt: null,
      } as any,
      include: {
        scope: true,
      } as any,
      orderBy: { createdAt: 'desc' },
    } as any)

    return NextResponse.json(watches)
  } catch (error) {
    console.error('Failed to get watches:', error)
    return NextResponse.json(
      { error: 'Failed to get watches' },
      { status: 500 }
    )
  }
}
