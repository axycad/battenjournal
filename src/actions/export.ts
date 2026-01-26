'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = void> = {
  success: boolean
  error?: string
  data?: T
}

// ============================================================================
// TYPES
// ============================================================================

export type ExportFormat = 'json' | 'csv'

export interface ExportOptions {
  caseId: string
  format: ExportFormat
  scopeCodes?: string[]
  startDate?: string
  endDate?: string
  includeMedia?: boolean
  includeDocuments?: boolean
  forResearch?: boolean
}

export interface ExportBundle {
  exportId: string
  caseInfo: {
    childDisplayName: string
    exportedAt: string
    exportedBy: string
    scopeFilter: string[] | null
    dateRange: { start: string | null; end: string | null }
  }
  events: ExportedEvent[]
  profile: ExportedProfile | null
  mediaManifest?: { id: string; filename: string; url: string }[]
  documentManifest?: { id: string; title: string; filename: string }[]
}

export interface ExportedEvent {
  id: string
  eventType: string
  occurredAt: string
  createdAt: string
  freeText: string | null
  scopes: string[]
  author: string
  mediaCount: number
}

export interface ExportedProfile {
  allergies: { substance: string; severity: string | null; reaction: string | null }[]
  medications: { name: string; dose: string | null; frequency: string | null; isActive: boolean }[]
  conditions: { name: string; diagnosedAt: string | null; status: string }[]
  measurements: { type: string; value: string; unit: string; recordedAt: string }[]
}

// ============================================================================
// ACCESS HELPERS
// ============================================================================

async function verifyCaseAccess(caseId: string) {
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

  // For clinicians, check consent and EXPORT permission
  if (membership.memberType === 'CARE_TEAM') {
    const hasExportPermission = await prisma.permissionGrant.findFirst({
      where: {
        membershipId: membership.id,
        accessMode: 'EXPORT',
        deletedAt: null,
        consent: {
          caseId,
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
    })

    if (!hasExportPermission) {
      return { error: 'Export permission required', membership: null }
    }
  }

  return { error: null, membership, userId: session.user.id }
}

// ============================================================================
// CREATE EXPORT
// ============================================================================

export async function createExport(
  options: ExportOptions
): Promise<ActionResult<{ exportId: string; bundle: ExportBundle }>> {
  const { error, membership, userId } = await verifyCaseAccess(options.caseId)
  if (error) return { success: false, error }

  const isParent = membership!.memberType === 'PARENT'

  // Get case info
  const caseData = await prisma.case.findUnique({
    where: { id: options.caseId },
    select: { childDisplayName: true },
  })

  if (!caseData) {
    return { success: false, error: 'Case not found' }
  }

  // Get user info for export record
  const user = await prisma.user.findUnique({
    where: { id: userId! },
    select: { name: true, email: true },
  })

  // Build event query
  const eventWhere: Record<string, unknown> = {
    caseId: options.caseId,
    deletedAt: null,
  }

  if (options.startDate) {
    eventWhere.occurredAt = { ...(eventWhere.occurredAt as object || {}), gte: new Date(options.startDate) }
  }
  if (options.endDate) {
    eventWhere.occurredAt = { ...(eventWhere.occurredAt as object || {}), lte: new Date(options.endDate) }
  }
  if (options.scopeCodes && options.scopeCodes.length > 0) {
    eventWhere.scopes = {
      some: {
        scope: { code: { in: options.scopeCodes } },
      },
    }
  }

  // For clinicians, filter by their accessible scopes
  if (!isParent) {
    const accessibleScopes = await prisma.permissionGrant.findMany({
      where: {
        membershipId: membership!.id,
        deletedAt: null,
        consent: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
      select: { scopeId: true },
    })

    const scopeIds = accessibleScopes.map((s) => s.scopeId)
    eventWhere.scopes = {
      some: { scopeId: { in: scopeIds } },
    }
  }

  // Fetch events
  const events = await prisma.event.findMany({
    where: eventWhere,
    include: {
      scopes: {
        include: { scope: { select: { code: true } } },
      },
      author: {
        select: { name: true },
      },
      mediaItems: true,
      _count: {
        select: { mediaItems: true },
      },
    },
    orderBy: { occurredAt: 'asc' },
  })

  // Fetch profile data (only for parents or if explicitly included)
  let profile: ExportedProfile | null = null
  if (isParent || options.forResearch) {
    const [allergies, medications, conditions, measurements] = await Promise.all([
      prisma.allergy.findMany({
        where: { caseId: options.caseId, deletedAt: null },
        select: { substance: true, severity: true, reaction: true },
      }),
      prisma.medication.findMany({
        where: { caseId: options.caseId, deletedAt: null },
        select: { name: true, dose: true, frequency: true, isActive: true },
      }),
      prisma.condition.findMany({
        where: { caseId: options.caseId, deletedAt: null },
        select: { name: true, diagnosedAt: true, status: true },
      }),
      prisma.measurement.findMany({
        where: { caseId: options.caseId, deletedAt: null },
        select: { measurementType: true, value: true, unit: true, recordedAt: true },
        orderBy: { recordedAt: 'desc' },
        take: 100,
      }),
    ])

    profile = {
      allergies: allergies.map((a) => ({
        substance: a.substance,
        severity: a.severity,
        reaction: a.reaction,
      })),
      medications: medications.map((m) => ({
        name: m.name,
        dose: m.dose,
        frequency: m.frequency,
        isActive: m.isActive,
      })),
      conditions: conditions.map((c) => ({
        name: c.name,
        diagnosedAt: c.diagnosedAt?.toISOString() || null,
        status: c.status,
      })),
      measurements: measurements.map((m) => ({
        type: m.measurementType,
        value: m.value.toString(),
        unit: m.unit || '',
        recordedAt: m.recordedAt.toISOString(),
      })),
    }
  }

  // Build media manifest if requested
  let mediaManifest: { id: string; filename: string; url: string }[] | undefined
  if (options.includeMedia) {
    const eventIds = events.map((e) => e.id)
    const mediaItems = await prisma.mediaItem.findMany({
      where: {
        eventId: { in: eventIds },
        deletedAt: null,
      },
      select: { id: true, originalFilename: true, storagePath: true },
    })

    mediaManifest = mediaItems.map((m) => ({
      id: m.id,
      filename: m.originalFilename,
      url: `/api/files/media/${m.id}`,
    }))
  }

  // Build document manifest if requested
  let documentManifest: { id: string; title: string; filename: string }[] | undefined
  if (options.includeDocuments && isParent) {
    const documents = await prisma.document.findMany({
      where: {
        caseId: options.caseId,
        deletedAt: null,
      },
      select: { id: true, title: true, originalFilename: true },
    })

    documentManifest = documents.map((d) => ({
      id: d.id,
      title: d.title,
      filename: d.originalFilename,
    }))
  }

  // Create export job record
  const exportJob = await prisma.exportJob.create({
    data: {
      caseId: options.caseId,
      requestedById: userId!,
      scopeFilter: options.scopeCodes ? JSON.stringify(options.scopeCodes) : null,
      format: options.format,
      status: 'completed',
      completedAt: new Date(),
    },
  })

  // Create audit entry
  await prisma.auditEntry.create({
    data: {
      caseId: options.caseId,
      actorUserId: userId!,
      action: 'EXPORT',
      objectType: 'ExportJob',
      objectId: exportJob.id,
      metadata: {
        format: options.format,
        scopeFilter: options.scopeCodes,
        eventCount: events.length,
        forResearch: options.forResearch || false,
      },
    },
  })

  const bundle: ExportBundle = {
    exportId: exportJob.id,
    caseInfo: {
      childDisplayName: options.forResearch ? 'REDACTED' : caseData.childDisplayName,
      exportedAt: new Date().toISOString(),
      exportedBy: user?.name || user?.email || 'Unknown',
      scopeFilter: options.scopeCodes || null,
      dateRange: {
        start: options.startDate || null,
        end: options.endDate || null,
      },
    },
    events: events.map((e) => ({
      id: options.forResearch ? `event_${events.indexOf(e) + 1}` : e.id,
      eventType: e.eventType,
      occurredAt: e.occurredAt.toISOString(),
      createdAt: e.createdAt.toISOString(),
      freeText: e.freeText,
      scopes: e.scopes.map((s) => s.scope.code),
      author: options.forResearch ? 'REDACTED' : (e.author.name || 'Unknown'),
      mediaCount: e._count.mediaItems,
    })),
    profile,
    mediaManifest,
    documentManifest,
  }

  revalidatePath(`/case/${options.caseId}`)
  return { success: true, data: { exportId: exportJob.id, bundle } }
}

// ============================================================================
// EXPORT TO CSV
// ============================================================================

export async function exportToCSV(bundle: ExportBundle): Promise<string> {
  const lines: string[] = []

  // Header
  lines.push('Event ID,Event Type,Occurred At,Created At,Scopes,Free Text,Author,Media Count')

  // Events
  for (const event of bundle.events) {
    const escapedText = event.freeText
      ? `"${event.freeText.replace(/"/g, '""')}"`
      : ''

    lines.push([
      event.id,
      event.eventType,
      event.occurredAt,
      event.createdAt,
      event.scopes.join(';'),
      escapedText,
      event.author,
      event.mediaCount.toString(),
    ].join(','))
  }

  return lines.join('\n')
}

// ============================================================================
// RESEARCH EXPORT (ANONYMIZED)
// ============================================================================

export async function createResearchExport(
  caseId: string,
  scopeCodes?: string[]
): Promise<ActionResult<{ exportId: string; bundle: ExportBundle }>> {
  // Verify research consent
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

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
    return { success: false, error: 'Only case owner can export for research' }
  }

  // Check research consent is active
  const researchConsent = await prisma.consent.findFirst({
    where: {
      caseId,
      consentType: 'RESEARCH',
      status: 'ACTIVE',
      deletedAt: null,
    },
  })

  if (!researchConsent) {
    return { success: false, error: 'Research consent required' }
  }

  return createExport({
    caseId,
    format: 'json',
    scopeCodes,
    includeMedia: false,
    includeDocuments: false,
    forResearch: true,
  })
}

// ============================================================================
// GET AVAILABLE SCOPES FOR EXPORT
// ============================================================================

export async function getAvailableScopesForExport(
  caseId: string
): Promise<{ code: string; label: string; eventCount: number }[]> {
  const { error, membership } = await verifyCaseAccess(caseId)
  if (error || !membership) return []

  const isParent = membership.memberType === 'PARENT'

  // Get scopes with event counts
  let scopeIds: string[] | undefined

  if (!isParent) {
    // For clinicians, filter by accessible scopes
    const grants = await prisma.permissionGrant.findMany({
      where: {
        membershipId: membership.id,
        deletedAt: null,
        consent: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
      select: { scopeId: true },
    })
    scopeIds = grants.map((g) => g.scopeId)
  }

  const scopes = await prisma.scope.findMany({
    where: scopeIds ? { id: { in: scopeIds } } : undefined,
    select: {
      code: true,
      label: true,
      eventScopes: {
        where: {
          event: {
            caseId,
            deletedAt: null,
          },
        },
        select: { id: true },
      },
    },
  })

  return scopes
    .map((s) => ({
      code: s.code,
      label: s.label,
      eventCount: s.eventScopes.length,
    }))
    .filter((s) => s.eventCount > 0)
    .sort((a, b) => b.eventCount - a.eventCount)
}
