'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { EVENT_TYPES, type EventType } from '@/lib/event-types'

export type ActionResult<T = void> = {
  success: boolean
  error?: string
  data?: T
}

// Helper to verify membership
async function verifyAccess(caseId: string, requireEditor = false) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Not authenticated', membership: null }
  }

  const membership = await prisma.membership.findFirst({
    where: {
      caseId,
      userId: session.user.id,
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) {
    return { error: 'Access denied', membership: null }
  }

  if (requireEditor && membership.familyRole === 'VIEWER') {
    return { error: 'View-only access', membership: null }
  }

  return { error: null, membership, userId: session.user.id }
}

export interface CreateEventInput {
  eventType: EventType
  freeText?: string
  occurredAt?: string // ISO date string, defaults to now
  scopeCodes?: string[] // Override default scopes if provided
}

export async function createEvent(
  caseId: string,
  input: CreateEventInput
): Promise<ActionResult<{ eventId: string }>> {
  const { error, userId } = await verifyAccess(caseId, true)
  if (error) return { success: false, error }

  const eventTypeConfig = EVENT_TYPES[input.eventType]
  if (!eventTypeConfig) {
    return { success: false, error: 'Invalid event type' }
  }

  // Use provided scopes or fall back to defaults
  const scopeCodes = input.scopeCodes ?? eventTypeConfig.defaultScopes

  // Parse occurred time or default to now
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date()

  const result = await prisma.$transaction(async (tx) => {
    // Create the event
    const event = await tx.event.create({
      data: {
        caseId,
        authorUserId: userId!,
        eventType: input.eventType,
        freeText: input.freeText?.trim() || null,
        occurredAt,
        loggedAt: new Date(),
      },
    })

    // Link scopes if any
    if (scopeCodes.length > 0) {
      // Get scope IDs
      const scopes = await tx.scope.findMany({
        where: { code: { in: scopeCodes as string[] } },
      })

      if (scopes.length > 0) {
        await tx.eventScope.createMany({
          data: scopes.map((scope) => ({
            eventId: event.id,
            scopeId: scope.id,
          })),
        })
      }
    }

    // Audit
    await tx.auditEntry.create({
      data: {
        actorUserId: userId!,
        action: 'EDIT',
        objectType: 'Event',
        objectId: event.id,
        metadata: { eventType: input.eventType },
      },
    })

    return event
  })

  revalidatePath(`/case/${caseId}/today`)
  revalidatePath(`/case/${caseId}`)
  return { success: true, data: { eventId: result.id } }
}

export async function updateEvent(
  eventId: string,
  input: {
    freeText?: string
    occurredAt?: string
    scopeCodes?: string[]
  }
): Promise<ActionResult> {
  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return { success: false, error: 'Event not found' }

  const { error, userId } = await verifyAccess(event.caseId, true)
  if (error) return { success: false, error }

  await prisma.$transaction(async (tx) => {
    // Update event
    await tx.event.update({
      where: { id: eventId },
      data: {
        freeText: input.freeText?.trim(),
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
      },
    })

    // Update scopes if provided
    if (input.scopeCodes !== undefined) {
      // Remove existing scopes
      await tx.eventScope.deleteMany({ where: { eventId } })

      // Add new scopes
      if (input.scopeCodes.length > 0) {
        const scopes = await tx.scope.findMany({
          where: { code: { in: input.scopeCodes as string[] } },
        })

        if (scopes.length > 0) {
          await tx.eventScope.createMany({
            data: scopes.map((scope) => ({
              eventId,
              scopeId: scope.id,
            })),
          })
        }
      }
    }

    await tx.auditEntry.create({
      data: {
        actorUserId: userId!,
        action: 'EDIT',
        objectType: 'Event',
        objectId: eventId,
      },
    })
  })

  revalidatePath(`/case/${event.caseId}/today`)
  revalidatePath(`/case/${event.caseId}`)
  return { success: true }
}

export async function deleteEvent(eventId: string): Promise<ActionResult> {
  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return { success: false, error: 'Event not found' }

  const { error, userId } = await verifyAccess(event.caseId, true)
  if (error) return { success: false, error }

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: eventId },
      data: { deletedAt: new Date() },
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: userId!,
        action: 'DELETE',
        objectType: 'Event',
        objectId: eventId,
      },
    })
  })

  revalidatePath(`/case/${event.caseId}/today`)
  revalidatePath(`/case/${event.caseId}`)
  return { success: true }
}

export interface EventWithScopes {
  id: string
  eventType: string
  freeText: string | null
  occurredAt: Date
  loggedAt: Date
  author: {
    id: string
    name: string | null
  }
  scopes: {
    code: string
    label: string
  }[]
  mediaItems: {
    id: string
    mimeType: string
    url: string
  }[]
  isBackdated: boolean
  isPartiallyHidden?: boolean // True if some scopes are hidden from viewer
}

export async function getEventsForCase(
  caseId: string,
  options?: {
    limit?: number
    beforeDate?: Date
  }
): Promise<EventWithScopes[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const membership = await prisma.membership.findFirst({
    where: {
      caseId,
      userId: session.user.id,
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) return []

  // Get granted scopes for non-parent members
  let grantedScopeCodes: string[] | null = null
  
  if (membership.memberType !== 'PARENT') {
    // Check consent is active
    const grants = await prisma.permissionGrant.findMany({
      where: {
        membershipId: membership.id,
        deletedAt: null,
        consent: {
          caseId,
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
      include: { scope: true },
    })

    if (grants.length === 0) {
      // No active consent, no access
      return []
    }

    grantedScopeCodes = grants.map((g) => g.scope.code)
  }

  // Fetch events
  const events = await prisma.event.findMany({
    where: {
      caseId,
      deletedAt: null,
      ...(options?.beforeDate && {
        occurredAt: { lt: options.beforeDate },
      }),
      // For clinicians, only show events that have at least one granted scope
      ...(grantedScopeCodes && {
        scopes: {
          some: {
            scope: {
              code: { in: grantedScopeCodes },
            },
          },
        },
      }),
    },
    include: {
      author: {
        select: { id: true, name: true },
      },
      scopes: {
        include: {
          scope: true,
        },
      },
      mediaItems: {
        where: { deletedAt: null },
        select: {
          id: true,
          storagePath: true,
          mimeType: true,
        },
      },
    },
    orderBy: { occurredAt: 'desc' },
    take: options?.limit || 50,
  })

  return events.map((event) => {
    const timeDiff = event.loggedAt.getTime() - event.occurredAt.getTime()
    const isBackdated = timeDiff > 5 * 60 * 1000

    // Filter scopes to only those granted (for clinicians)
    let visibleScopes = event.scopes.map((es) => ({
      code: es.scope.code,
      label: es.scope.label,
    }))

    let isPartiallyHidden = false

    if (grantedScopeCodes) {
      const originalCount = visibleScopes.length
      visibleScopes = visibleScopes.filter((s) =>
        grantedScopeCodes!.includes(s.code)
      )
      isPartiallyHidden = visibleScopes.length < originalCount
    }

    return {
      id: event.id,
      eventType: event.eventType,
      freeText: event.freeText,
      occurredAt: event.occurredAt,
      loggedAt: event.loggedAt,
      author: event.author,
      scopes: visibleScopes,
      mediaItems: event.mediaItems.map((m) => ({
        id: m.id,
        mimeType: m.mimeType,
        url: `/api/files/${m.storagePath}`,
      })),
      isBackdated,
      isPartiallyHidden,
    }
  })
}

export async function getTodayEvents(caseId: string): Promise<EventWithScopes[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { error } = await verifyAccess(caseId)
  if (error) return []

  const events = await prisma.event.findMany({
    where: {
      caseId,
      deletedAt: null,
      occurredAt: { gte: today },
    },
    include: {
      author: {
        select: { id: true, name: true },
      },
      scopes: {
        include: {
          scope: true,
        },
      },
      mediaItems: true,
    },
    orderBy: { occurredAt: 'desc' },
  })

  return events.map((event) => {
    const timeDiff = event.loggedAt.getTime() - event.occurredAt.getTime()
    const isBackdated = timeDiff > 5 * 60 * 1000

    return {
      id: event.id,
      eventType: event.eventType,
      freeText: event.freeText,
      occurredAt: event.occurredAt,
      loggedAt: event.loggedAt,
      author: event.author,
      scopes: event.scopes.map((es) => ({
        code: es.scope.code,
        label: es.scope.label,
      })),
      mediaItems: event.mediaItems.map((m) => ({
        id: m.id,
        mimeType: m.mimeType,
        url: `/api/files/${m.storagePath}`,
      })),
      isBackdated,
    }
  })
}

// Get all scopes for the scope picker
export async function getAllScopes() {
  return prisma.scope.findMany({
    orderBy: { code: 'asc' },
  })
}
