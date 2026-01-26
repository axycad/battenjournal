'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = void> = {
  success: boolean
  error?: string
  data?: T
}

export interface WatchWithScope {
  id: string
  scope: {
    id: string
    code: string
    label: string
  }
  createdAt: Date
}

export interface WatchedUpdate {
  scope: {
    code: string
    label: string
  }
  events: {
    id: string
    eventType: string
    occurredAt: Date
    freeText: string | null
  }[]
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
// WATCHES
// ============================================================================

export async function createWatch(
  caseId: string,
  scopeId: string
): Promise<ActionResult<{ watchId: string }>> {
  const { error, membership } = await verifyClinicalAccess(caseId)
  if (error || !membership) {
    return { success: false, error: error || 'Access denied' }
  }

  // Verify scope exists
  const scope = await prisma.scope.findUnique({
    where: { id: scopeId },
  })

  if (!scope) {
    return { success: false, error: 'Scope not found' }
  }

  // Check if already watching (and not removed)
  const existing = await prisma.watch.findFirst({
    where: {
      caseId,
      membershipId: membership.id,
      scopeId,
      removedAt: null,
      deletedAt: null,
    },
  })

  if (existing) {
    return { success: true, data: { watchId: existing.id } }
  }

  // Check if previously removed - reactivate
  const removed = await prisma.watch.findFirst({
    where: {
      caseId,
      membershipId: membership.id,
      scopeId,
      removedAt: { not: null },
      deletedAt: null,
    },
  })

  if (removed) {
    await prisma.watch.update({
      where: { id: removed.id },
      data: { removedAt: null },
    })

    revalidatePath(`/case/${caseId}`)
    return { success: true, data: { watchId: removed.id } }
  }

  // Create new watch
  const watch = await prisma.watch.create({
    data: {
      caseId,
      membershipId: membership.id,
      scopeId,
    },
  })

  revalidatePath(`/case/${caseId}`)
  return { success: true, data: { watchId: watch.id } }
}

export async function removeWatch(watchId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const watch = await prisma.watch.findUnique({
    where: { id: watchId },
    include: { membership: true },
  })

  if (!watch || watch.deletedAt || watch.removedAt) {
    return { success: false, error: 'Watch not found' }
  }

  // Only the owner of the watch can remove it
  if (watch.membership.userId !== session.user.id) {
    return { success: false, error: 'Cannot remove another user\'s watch' }
  }

  await prisma.watch.update({
    where: { id: watchId },
    data: { removedAt: new Date() },
  })

  revalidatePath(`/case/${watch.caseId}`)
  return { success: true }
}

export async function getWatchesForUser(caseId: string): Promise<WatchWithScope[]> {
  const { error, membership } = await verifyClinicalAccess(caseId)
  if (error || !membership) return []

  const watches = await prisma.watch.findMany({
    where: {
      caseId,
      membershipId: membership.id,
      removedAt: null,
      deletedAt: null,
    },
    include: {
      scope: {
        select: { id: true, code: true, label: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return watches.map((w) => ({
    id: w.id,
    scope: w.scope,
    createdAt: w.createdAt,
  }))
}

export async function getWatchedUpdates(caseId: string): Promise<WatchedUpdate[]> {
  const { error, membership } = await verifyClinicalAccess(caseId)
  if (error || !membership) return []

  // Get active watches
  const watches = await prisma.watch.findMany({
    where: {
      caseId,
      membershipId: membership.id,
      removedAt: null,
      deletedAt: null,
    },
    include: { scope: true },
  })

  if (watches.length === 0) return []

  // Get recent events for watched scopes (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const results = await Promise.all(
    watches.map(async (watch) => {
      const events = await prisma.event.findMany({
        where: {
          caseId,
          deletedAt: null,
          createdAt: { gte: sevenDaysAgo },
          scopes: {
            some: { scopeId: watch.scopeId },
          },
        },
        select: {
          id: true,
          eventType: true,
          occurredAt: true,
          freeText: true,
        },
        orderBy: { occurredAt: 'desc' },
        take: 10,
      })

      return {
        scope: {
          code: watch.scope.code,
          label: watch.scope.label,
        },
        events,
      }
    })
  )

  // Filter out scopes with no events
  return results.filter((r) => r.events.length > 0)
}

export async function getAvailableScopesForWatch(
  caseId: string
): Promise<{ id: string; code: string; label: string }[]> {
  const { error, membership } = await verifyClinicalAccess(caseId)
  if (error || !membership) return []

  // Get scopes the clinician has access to (via permission grants)
  const grants = await prisma.permissionGrant.findMany({
    where: {
      membershipId: membership.id,
      deletedAt: null,
    },
    include: {
      scope: {
        select: { id: true, code: true, label: true },
      },
    },
  })

  return grants.map((g) => g.scope)
}
