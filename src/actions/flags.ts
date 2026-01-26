'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = void> = {
  success: boolean
  error?: string
  data?: T
}

export type FlagLabel = 'urgent' | 'follow_up'

export interface FlagWithDetails {
  id: string
  label: string
  status: 'OPEN' | 'RESOLVED'
  visibility: 'TEAM_ONLY' | 'SHARE_WITH_PARENT'
  anchorType: string
  anchorId: string
  createdAt: Date
  resolvedAt: Date | null
  createdBy: {
    id: string
    name: string | null
  }
}

// ============================================================================
// ACCESS HELPERS
// ============================================================================

async function verifyClinicalAccess(caseId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Not authenticated', membership: null }
  }

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
    return { error: 'Clinician access required', membership: null }
  }

  // Check consent is active
  const consent = await prisma.consent.findFirst({
    where: {
      caseId,
      consentType: 'CLINICAL',
      status: 'ACTIVE',
      deletedAt: null,
      permissionGrants: {
        some: {
          membershipId: membership.id,
          deletedAt: null,
        },
      },
    },
  })

  if (!consent) {
    return { error: 'Clinical access paused or revoked', membership: null }
  }

  return { error: null, membership, userId: session.user.id }
}

// ============================================================================
// FLAGS
// ============================================================================

export async function createFlag(input: {
  caseId: string
  anchorType: 'event' | 'case'
  anchorId: string
  label: FlagLabel
  visibility?: 'TEAM_ONLY' | 'SHARE_WITH_PARENT'
}): Promise<ActionResult<{ flagId: string }>> {
  const { error, userId } = await verifyClinicalAccess(input.caseId)
  if (error) return { success: false, error }

  // If event-anchored, verify event exists
  if (input.anchorType === 'event') {
    const event = await prisma.event.findFirst({
      where: {
        id: input.anchorId,
        caseId: input.caseId,
        deletedAt: null,
      },
    })

    if (!event) {
      return { success: false, error: 'Event not found' }
    }
  }

  const flag = await prisma.$transaction(async (tx) => {
    const newFlag = await tx.flag.create({
      data: {
        caseId: input.caseId,
        anchorType: input.anchorType.toUpperCase() as 'EVENT' | 'CASE',
        anchorId: input.anchorId,
        createdById: userId!,
        label: input.label,
        visibility: input.visibility || 'TEAM_ONLY',
      },
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: userId!,
        action: 'EDIT',
        objectType: 'Flag',
        objectId: newFlag.id,
        metadata: {
          label: input.label,
          anchorType: input.anchorType,
          anchorId: input.anchorId,
        },
      },
    })

    return newFlag
  })

  revalidatePath(`/case/${input.caseId}`)
  return { success: true, data: { flagId: flag.id } }
}

export async function resolveFlag(flagId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const flag = await prisma.flag.findUnique({
    where: { id: flagId },
  })

  if (!flag || flag.deletedAt) {
    return { success: false, error: 'Flag not found' }
  }

  const { error } = await verifyClinicalAccess(flag.caseId)
  if (error) return { success: false, error }

  await prisma.$transaction(async (tx) => {
    await tx.flag.update({
      where: { id: flagId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: session.user.id,
        action: 'EDIT',
        objectType: 'Flag',
        objectId: flagId,
        metadata: { action: 'resolved' },
      },
    })
  })

  revalidatePath(`/case/${flag.caseId}`)
  return { success: true }
}

export async function reopenFlag(flagId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const flag = await prisma.flag.findUnique({
    where: { id: flagId },
  })

  if (!flag || flag.deletedAt) {
    return { success: false, error: 'Flag not found' }
  }

  const { error } = await verifyClinicalAccess(flag.caseId)
  if (error) return { success: false, error }

  await prisma.$transaction(async (tx) => {
    await tx.flag.update({
      where: { id: flagId },
      data: {
        status: 'OPEN',
        resolvedAt: null,
      },
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: session.user.id,
        action: 'EDIT',
        objectType: 'Flag',
        objectId: flagId,
        metadata: { action: 'reopened' },
      },
    })
  })

  revalidatePath(`/case/${flag.caseId}`)
  return { success: true }
}

export async function deleteFlag(flagId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const flag = await prisma.flag.findUnique({
    where: { id: flagId },
  })

  if (!flag || flag.deletedAt) {
    return { success: false, error: 'Flag not found' }
  }

  // Only creator can delete
  if (flag.createdById !== session.user.id) {
    return { success: false, error: 'Only the creator can delete this flag' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.flag.update({
      where: { id: flagId },
      data: { deletedAt: new Date() },
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: session.user.id,
        action: 'DELETE',
        objectType: 'Flag',
        objectId: flagId,
      },
    })
  })

  revalidatePath(`/case/${flag.caseId}`)
  return { success: true }
}

export async function getFlagsForCase(
  caseId: string,
  options?: { includeResolved?: boolean }
): Promise<FlagWithDetails[]> {
  const { error, membership } = await verifyClinicalAccess(caseId)
  
  // Only clinicians see flags
  if (error || !membership) return []

  const flags = await prisma.flag.findMany({
    where: {
      caseId,
      deletedAt: null,
      ...(options?.includeResolved ? {} : { status: 'OPEN' }),
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: [
      { status: 'asc' }, // OPEN first
      { createdAt: 'desc' },
    ],
  })

  return flags.map((f) => ({
    id: f.id,
    label: f.label,
    status: f.status,
    visibility: f.visibility,
    anchorType: f.anchorType,
    anchorId: f.anchorId,
    createdAt: f.createdAt,
    resolvedAt: f.resolvedAt,
    createdBy: f.createdBy,
  }))
}

export async function getFlagsForEvent(
  caseId: string,
  eventId: string
): Promise<FlagWithDetails[]> {
  const { error } = await verifyClinicalAccess(caseId)
  if (error) return []

  const flags = await prisma.flag.findMany({
    where: {
      caseId,
      anchorType: 'EVENT',
      anchorId: eventId,
      status: 'OPEN',
      deletedAt: null,
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return flags.map((f) => ({
    id: f.id,
    label: f.label,
    status: f.status,
    visibility: f.visibility,
    anchorType: f.anchorType,
    anchorId: f.anchorId,
    createdAt: f.createdAt,
    resolvedAt: f.resolvedAt,
    createdBy: f.createdBy,
  }))
}
