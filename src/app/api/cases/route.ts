import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createCaseSchema } from '@/lib/validations'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

// GET /api/cases - List all cases for current user
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const memberships = await prisma.membership.findMany({
      where: {
        userId: session.user.id,
        revokedAt: null,
        deletedAt: null,
      },
      include: {
        case: {
          include: {
            profile: true,
            _count: {
              select: {
                events: true,
                memberships: {
                  where: {
                    revokedAt: null,
                    deletedAt: null,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        addedAt: 'desc',
      },
    })

    const cases = memberships.map((m) => ({
      caseId: m.case.id,
      childDisplayName: m.case.childDisplayName,
      dateOfBirth: m.case.profile?.dateOfBirth,
      familyRole: m.familyRole,
      memberType: m.memberType,
      profile: m.case.profile,
      eventCount: m.case._count.events,
      memberCount: m.case._count.memberships,
      createdAt: m.case.createdAt,
      updatedAt: m.case.updatedAt,
    }))

    return NextResponse.json(cases)
  } catch (error) {
    console.error('Failed to list cases:', error)
    return NextResponse.json(
      { error: 'Failed to list cases' },
      { status: 500 }
    )
  }
}

// POST /api/cases - Create a new case
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Validate input
    const parsed = createCaseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { childDisplayName, diseaseProfileVersion } = parsed.data

    // Create case with profile and membership in transaction
    const newCase = await prisma.$transaction(async (tx) => {
      const caseRecord = await tx.case.create({
        data: {
          childDisplayName,
          diseaseProfileVersion,
        },
      })

      // Create empty patient profile
      await tx.patientProfile.create({
        data: {
          caseId: caseRecord.id,
        },
      })

      // Create membership for creator as OWNER_ADMIN
      await tx.membership.create({
        data: {
          caseId: caseRecord.id,
          userId: session.user.id,
          memberType: 'PARENT',
          familyRole: 'OWNER_ADMIN',
        },
      })

      // Audit
      await tx.auditEntry.create({
        data: {
          actorUserId: session.user.id,
          action: 'EDIT',
          objectType: 'Case',
          objectId: caseRecord.id,
          metadata: { action: 'create' },
        },
      })

      return caseRecord
    })

    return NextResponse.json({
      success: true,
      caseId: newCase.id,
      case: newCase,
    })
  } catch (error) {
    console.error('Failed to create case:', error)
    return NextResponse.json(
      { error: 'Failed to create case' },
      { status: 500 }
    )
  }
}
