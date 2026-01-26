'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createCaseSchema, type CreateCaseInput } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = void> = {
  success: boolean
  error?: string
  data?: T
}

export async function createCase(
  input: CreateCaseInput
): Promise<ActionResult<{ caseId: string }>> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const parsed = createCaseSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { childDisplayName, diseaseProfileVersion } = parsed.data

  // Create case with profile and membership in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the case
    const newCase = await tx.case.create({
      data: {
        childDisplayName,
        diseaseProfileVersion,
      },
    })

    // Create empty patient profile
    await tx.patientProfile.create({
      data: {
        caseId: newCase.id,
      },
    })

    // Create membership for creator as OWNER_ADMIN
    await tx.membership.create({
      data: {
        caseId: newCase.id,
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
        objectId: newCase.id,
        metadata: { action: 'create' },
      },
    })

    return newCase
  })

  revalidatePath('/dashboard')
  return { success: true, data: { caseId: result.id } }
}

export async function getCasesForUser() {
  const session = await auth()
  if (!session?.user?.id) {
    return []
  }

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

  return memberships.map((m) => ({
    caseId: m.case.id,
    childDisplayName: m.case.childDisplayName,
    familyRole: m.familyRole,
    memberType: m.memberType,
    profile: m.case.profile,
    eventCount: m.case._count.events,
    memberCount: m.case._count.memberships,
  }))
}

export async function getCase(caseId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return null
  }

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
    return null
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
    return null
  }

  return {
    ...caseData,
    currentUserRole: membership.familyRole,
    currentUserMemberType: membership.memberType,
  }
}
