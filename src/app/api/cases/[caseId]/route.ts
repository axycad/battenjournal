import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ caseId: string }>
}

// GET /api/cases/[caseId] - Get a specific case
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { caseId } = await params

    // Verify membership
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
        { error: 'Case not found or access denied' },
        { status: 404 }
      )
    }

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        profile: true,
        allergies: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
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
        careIntent: true,
        memberships: {
          where: {
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
        },
      },
    })

    if (!caseData) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...caseData,
      currentUserRole: membership.familyRole,
      currentUserMemberType: membership.memberType,
    })
  } catch (error) {
    console.error('Failed to get case:', error)
    return NextResponse.json(
      { error: 'Failed to get case' },
      { status: 500 }
    )
  }
}

// PUT /api/cases/[caseId] - Update a case
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { caseId } = await params
    const body = await request.json()

    // Verify user has edit access
    const membership = await prisma.membership.findFirst({
      where: {
        caseId,
        userId: session.user.id,
        memberType: 'PARENT',
        familyRole: { in: ['OWNER_ADMIN', 'EDITOR'] },
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

    const updates: any = {}
    if (body.childDisplayName) updates.childDisplayName = body.childDisplayName

    const updatedCase = await prisma.$transaction(async (tx) => {
      const caseRecord = await tx.case.update({
        where: { id: caseId },
        data: updates,
      })

      // Update profile if dateOfBirth provided
      if (body.dateOfBirth) {
        await tx.patientProfile.update({
          where: { caseId },
          data: {
            dateOfBirth: new Date(body.dateOfBirth),
          },
        })
      }

      // Audit
      await tx.auditEntry.create({
        data: {
          actorUserId: session.user.id,
          action: 'EDIT',
          objectType: 'Case',
          objectId: caseId,
          metadata: { action: 'update', updates: Object.keys(updates) },
        },
      })

      return caseRecord
    })

    return NextResponse.json({
      success: true,
      case: updatedCase,
    })
  } catch (error) {
    console.error('Failed to update case:', error)
    return NextResponse.json(
      { error: 'Failed to update case' },
      { status: 500 }
    )
  }
}

// DELETE /api/cases/[caseId] - Soft delete a case
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { caseId } = await params

    // Verify user is OWNER_ADMIN
    const membership = await prisma.membership.findFirst({
      where: {
        caseId,
        userId: session.user.id,
        memberType: 'PARENT',
        familyRole: 'OWNER_ADMIN',
        revokedAt: null,
        deletedAt: null,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Only owners can delete cases' },
        { status: 403 }
      )
    }

    // Soft delete case and related data
    await prisma.$transaction(async (tx) => {
      await tx.case.update({
        where: { id: caseId },
        data: { deletedAt: new Date() },
      })

      // Audit
      await tx.auditEntry.create({
        data: {
          actorUserId: session.user.id,
          action: 'DELETE',
          objectType: 'Case',
          objectId: caseId,
          metadata: { action: 'delete' },
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete case:', error)
    return NextResponse.json(
      { error: 'Failed to delete case' },
      { status: 500 }
    )
  }
}

// For Capacitor static export, skip this dynamic route
export async function generateStaticParams() {
  return []
}
