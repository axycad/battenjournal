'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type ActionResult<T = void> = {
  success: boolean
  error?: string
  data?: T
}

// ============================================================================
// TYPES
// ============================================================================

export interface AccessSummary {
  clinicians: {
    userId: string
    name: string | null
    email: string
    specialty: string | null
    consentStatus: 'ACTIVE' | 'PAUSED' | 'REVOKED'
    scopes: { code: string; label: string; accessMode: string }[]
    grantedAt: Date
  }[]
  familyMembers: {
    userId: string
    name: string | null
    email: string
    role: string
    joinedAt: Date
  }[]
}

export interface AuditLogEntry {
  id: string
  action: string
  objectType: string
  objectId: string
  metadata: Record<string, unknown> | null
  timestamp: Date
  actor: {
    id: string
    name: string | null
    email: string
    memberType: string | null
  }
}

export interface PermissionChangeEntry {
  id: string
  action: 'GRANT' | 'REVOKE' | 'EDIT'
  timestamp: Date
  actor: {
    id: string
    name: string | null
  }
  target: {
    id: string
    name: string | null
    email: string
  } | null
  details: string
}

export interface DocumentAccessEntry {
  id: string
  documentId: string
  documentTitle: string
  action: 'VIEW' | 'DOWNLOAD'
  timestamp: Date
  accessor: {
    id: string
    name: string | null
    memberType: string
  }
}

export interface ExportHistoryEntry {
  id: string
  format: string
  scopeFilter: string[] | null
  status: string
  requestedAt: Date
  completedAt: Date | null
  requestedBy: {
    id: string
    name: string | null
  }
}

// ============================================================================
// ACCESS HELPERS
// ============================================================================

async function verifyParentAdmin(caseId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Not authenticated', membership: null }
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
    return { error: 'Admin access required', membership: null }
  }

  return { error: null, membership, userId: session.user.id }
}

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

  return { error: null, membership, userId: session.user.id }
}

// ============================================================================
// ACCESS SUMMARY
// ============================================================================

export async function getAccessSummary(caseId: string): Promise<AccessSummary | null> {
  const { error } = await verifyParentAdmin(caseId)
  if (error) return null

  // Get all family members
  const familyMemberships = await prisma.membership.findMany({
    where: {
      caseId,
      memberType: 'PARENT',
      revokedAt: null,
      deletedAt: null,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { addedAt: 'asc' },
  })

  // Get all clinicians with their consent and permissions
  const clinicalConsent = await prisma.consent.findFirst({
    where: {
      caseId,
      consentType: 'CLINICAL',
      deletedAt: null,
    },
    include: {
      permissionGrants: {
        where: { deletedAt: null },
        include: {
          membership: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          scope: {
            select: { code: true, label: true },
          },
        },
      },
    },
  })

  // Group permissions by clinician
  const clinicianMap = new Map<string, {
    userId: string
    name: string | null
    email: string
    specialty: string | null
    scopes: { code: string; label: string; accessMode: string }[]
    grantedAt: Date
  }>()

  if (clinicalConsent) {
    for (const grant of clinicalConsent.permissionGrants) {
      const userId = grant.membership.userId
      
      if (!clinicianMap.has(userId)) {
        clinicianMap.set(userId, {
          userId,
          name: grant.membership.user.name,
          email: grant.membership.user.email,
          specialty: null,
          scopes: [],
          grantedAt: grant.createdAt,
        })
      }

      clinicianMap.get(userId)!.scopes.push({
        code: grant.scope.code,
        label: grant.scope.label,
        accessMode: grant.accessMode,
      })
    }
  }

  return {
    clinicians: Array.from(clinicianMap.values()).map((c) => ({
      ...c,
      consentStatus: clinicalConsent?.status || 'REVOKED',
    })),
    familyMembers: familyMemberships.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.familyRole || 'VIEWER',
      joinedAt: m.createdAt,
    })),
  }
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export async function getAuditLog(
  caseId: string,
  options?: {
    limit?: number
    offset?: number
    actions?: string[]
    startDate?: Date
    endDate?: Date
  }
): Promise<{ entries: AuditLogEntry[]; total: number }> {
  const { error } = await verifyParentAdmin(caseId)
  if (error) return { entries: [], total: 0 }

  const where = {
    caseId,
    ...(options?.actions && { action: { in: options.actions as any } }),
    ...(options?.startDate && { ts: { gte: options.startDate } }),
    ...(options?.endDate && { ts: { lte: options.endDate } }),
  }

  const [entries, total] = await Promise.all([
    prisma.auditEntry.findMany({
      where,
      include: {
        actor: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { ts: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.auditEntry.count({ where }),
  ])

  // Get membership info for actors
  const actorIds = Array.from(new Set(entries.map((e) => e.actorUserId)))
  const memberships = await prisma.membership.findMany({
    where: {
      caseId,
      userId: { in: actorIds },
    },
    select: { userId: true, memberType: true },
  })
  const membershipMap = new Map(memberships.map((m) => [m.userId, m.memberType]))

  return {
    entries: entries.map((e) => ({
      id: e.id,
      action: e.action,
      objectType: e.objectType,
      objectId: e.objectId,
      metadata: e.metadata as Record<string, unknown> | null,
      timestamp: e.ts,
      actor: {
        id: e.actor.id,
        name: e.actor.name,
        email: e.actor.email,
        memberType: membershipMap.get(e.actorUserId) || null,
      },
    })),
    total,
  }
}

// ============================================================================
// PERMISSION CHANGES
// ============================================================================

export async function getPermissionChanges(
  caseId: string,
  options?: { limit?: number }
): Promise<PermissionChangeEntry[]> {
  const { error } = await verifyParentAdmin(caseId)
  if (error) return []

  const entries = await prisma.auditEntry.findMany({
    where: {
      caseId,
      action: { in: ['GRANT', 'REVOKE', 'EDIT'] as any },
      objectType: { in: ['PermissionGrant', 'Consent', 'Membership'] },
    },
    include: {
      actor: {
        select: { id: true, name: true },
      },
    },
    orderBy: { ts: 'desc' },
    take: options?.limit || 50,
  })

  // Enrich with target user info from metadata
  const results: PermissionChangeEntry[] = []

  for (const entry of entries) {
    const metadata = entry.metadata as Record<string, unknown> | null
    let target = null
    let details = ''

    if (metadata?.targetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: metadata.targetUserId as string },
        select: { id: true, name: true, email: true },
      })
      target = targetUser
    }

    // Build human-readable details
    if (entry.objectType === 'Consent') {
      if (entry.action === 'EDIT') {
        details = `Clinical consent ${metadata?.newStatus || 'updated'}`
      }
    } else if (entry.objectType === 'PermissionGrant') {
      const scopeLabel = metadata?.scopeLabel || metadata?.scopeCode || 'scope'
      if (entry.action === 'GRANT') {
        details = `Granted access to ${scopeLabel}`
      } else if (entry.action === 'REVOKE') {
        details = `Revoked access to ${scopeLabel}`
      }
    } else if (entry.objectType === 'Membership') {
      if (entry.action === 'GRANT') {
        details = `Added as ${metadata?.memberType || 'member'}`
      } else if (entry.action === 'REVOKE') {
        details = `Access revoked`
      } else if (entry.action === 'EDIT') {
        details = `Role changed to ${metadata?.newRole || 'unknown'}`
      }
    }

    results.push({
      id: entry.id,
      action: entry.action as 'GRANT' | 'REVOKE' | 'EDIT',
      timestamp: entry.ts,
      actor: entry.actor,
      target,
      details,
    })
  }

  return results
}

// ============================================================================
// DOCUMENT ACCESS LOG
// ============================================================================

export async function getDocumentAccessLog(
  caseId: string,
  options?: { limit?: number; cliniciansOnly?: boolean }
): Promise<DocumentAccessEntry[]> {
  const { error } = await verifyParentAdmin(caseId)
  if (error) return []

  const entries = await prisma.auditEntry.findMany({
    where: {
      caseId,
      action: { in: ['VIEW', 'DOWNLOAD'] as any },
      objectType: 'Document',
    },
    include: {
      actor: {
        select: { id: true, name: true },
      },
    },
    orderBy: { ts: 'desc' },
    take: options?.limit || 100,
  })

  // Get membership info to filter by clinicians if needed
  const actorIds = Array.from(new Set(entries.map((e) => e.actorUserId)))
  const memberships = await prisma.membership.findMany({
    where: {
      caseId,
      userId: { in: actorIds },
    },
    select: { userId: true, memberType: true },
  })
  const membershipMap = new Map(memberships.map((m) => [m.userId, m.memberType]))

  // Get document titles
  const documentIds = Array.from(new Set(entries.map((e) => e.objectId)))
  const documents = await prisma.document.findMany({
    where: { id: { in: documentIds } },
    select: { id: true, title: true },
  })
  const documentMap = new Map(documents.map((d) => [d.id, d.title]))

  let results = entries.map((e) => ({
    id: e.id,
    documentId: e.objectId,
    documentTitle: documentMap.get(e.objectId) || 'Unknown document',
    action: e.action as 'VIEW' | 'DOWNLOAD',
    timestamp: e.ts,
    accessor: {
      id: e.actor.id,
      name: e.actor.name,
      memberType: membershipMap.get(e.actorUserId) || 'UNKNOWN',
    },
  }))

  if (options?.cliniciansOnly) {
    results = results.filter((r) => r.accessor.memberType === 'CARE_TEAM')
  }

  return results
}

// ============================================================================
// EXPORT HISTORY
// ============================================================================

export async function getExportHistory(caseId: string): Promise<ExportHistoryEntry[]> {
  const { error } = await verifyParentAdmin(caseId)
  if (error) return []

  const exports = await prisma.exportJob.findMany({
    where: { caseId },
    include: {
      requestedBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { addedAt: 'desc' },
  })

  return exports.map((e) => ({
    id: e.id,
    format: e.format,
    scopeFilter: e.scopeFilter ? JSON.parse(e.scopeFilter) : null,
    status: e.status,
    requestedAt: e.createdAt,
    completedAt: e.completedAt,
    requestedBy: e.requestedBy,
  }))
}

// ============================================================================
// RECORD AUDIT ENTRIES
// ============================================================================

export async function recordDocumentAccess(
  caseId: string,
  documentId: string,
  action: 'VIEW' | 'DOWNLOAD'
): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return

  await prisma.auditEntry.create({
    data: {
      caseId,
      actorUserId: session.user.id,
      action,
      objectType: 'Document',
      objectId: documentId,
    },
  })
}

export async function recordPermissionChange(
  caseId: string,
  action: 'GRANT' | 'REVOKE' | 'EDIT',
  objectType: string,
  objectId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return

  await prisma.auditEntry.create({
    data: {
      caseId,
      actorUserId: session.user.id,
      action,
      objectType,
      objectId,
      metadata: metadata as any,
    },
  })
}

