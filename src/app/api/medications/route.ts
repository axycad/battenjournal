import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/medications - Get medications with status for a case
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

    const medications = await prisma.medication.findMany({
      where: {
        caseId,
        deletedAt: null,
        active: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get last administration for each medication
    const medicationsWithStatus = await Promise.all(
      medications.map(async (med) => {
        const lastAdmin = await prisma.medicationAdministration.findFirst({
          where: {
            medicationId: med.id,
            deletedAt: null,
          },
          orderBy: { administeredAt: 'desc' } as any,
        } as any)

        return {
          ...med,
          lastAdministeredAt: (lastAdmin as any)?.administeredAt || null,
          lastAdministeredBy: (lastAdmin as any)?.administeredByUserId || null,
        }
      })
    )

    return NextResponse.json(medicationsWithStatus)
  } catch (error) {
    console.error('Failed to get medications:', error)
    return NextResponse.json(
      { error: 'Failed to get medications' },
      { status: 500 }
    )
  }
}
