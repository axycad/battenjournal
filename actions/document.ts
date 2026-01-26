'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStorage } from '@/lib/storage'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = void> = {
  success: boolean
  error?: string
  data?: T
}

// Helper to verify access
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

  if (requireEditor) {
    if (membership.memberType !== 'PARENT') {
      return { error: 'Parent access required', membership: null }
    }
    if (membership.familyRole === 'VIEWER') {
      return { error: 'View-only access', membership: null }
    }
  }

  return { error: null, membership, userId: session.user.id }
}

// ============================================================================
// DOCUMENTS
// ============================================================================

export interface DocumentWithScopes {
  id: string
  title: string
  kind: string
  mimeType: string
  size: number
  url: string
  uploadedAt: Date
  uploadedBy: {
    id: string
    name: string | null
  }
  scopes: {
    code: string
    label: string
  }[]
  eventId: string | null
  isCritical: boolean
}

export async function getDocumentsForCase(caseId: string): Promise<DocumentWithScopes[]> {
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

    if (grants.length === 0) return []
    grantedScopeCodes = grants.map((g) => g.scope.code)
  }

  // Fetch documents
  const documents = await prisma.document.findMany({
    where: {
      caseId,
      deletedAt: null,
      // For clinicians, only show documents with matching scopes
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
      uploadedBy: {
        select: { id: true, name: true },
      },
      scopes: {
        include: { scope: true },
      },
    },
    orderBy: { uploadedAt: 'desc' },
  })

  const storage = getStorage()

  return documents.map((doc) => {
    let visibleScopes = doc.scopes.map((ds) => ({
      code: ds.scope.code,
      label: ds.scope.label,
    }))

    // Filter scopes for clinicians
    if (grantedScopeCodes) {
      visibleScopes = visibleScopes.filter((s) =>
        grantedScopeCodes!.includes(s.code)
      )
    }

    return {
      id: doc.id,
      title: doc.title,
      kind: doc.kind,
      mimeType: doc.mimeType,
      size: doc.size,
      url: storage.getUrl(doc.storagePath),
      uploadedAt: doc.uploadedAt,
      uploadedBy: doc.uploadedBy,
      scopes: visibleScopes,
      eventId: doc.eventId,
      isCritical: doc.isCritical,
    }
  })
}

export async function updateDocument(
  documentId: string,
  input: {
    title?: string
    kind?: string
    scopeCodes?: string[]
    isCritical?: boolean
  }
): Promise<ActionResult> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  })

  if (!document) {
    return { success: false, error: 'Document not found' }
  }

  const { error, userId } = await verifyAccess(document.caseId, true)
  if (error) return { success: false, error }

  await prisma.$transaction(async (tx) => {
    // Update document
    await tx.document.update({
      where: { id: documentId },
      data: {
        title: input.title,
        kind: input.kind as 'LAB_REPORT' | 'CLINIC_LETTER' | 'GENETIC_REPORT' | 'INSURANCE' | 'OTHER' | undefined,
        isCritical: input.isCritical,
      },
    })

    // Update scopes if provided
    if (input.scopeCodes !== undefined) {
      // Remove existing scopes
      await tx.documentScope.deleteMany({ where: { documentId } })

      // Add new scopes
      if (input.scopeCodes.length > 0) {
        const scopes = await tx.scope.findMany({
          where: { code: { in: input.scopeCodes } },
        })

        if (scopes.length > 0) {
          await tx.documentScope.createMany({
            data: scopes.map((scope) => ({
              documentId,
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
        objectType: 'Document',
        objectId: documentId,
      },
    })
  })

  revalidatePath(`/case/${document.caseId}/documents`)
  return { success: true }
}

export async function deleteDocument(documentId: string): Promise<ActionResult> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  })

  if (!document) {
    return { success: false, error: 'Document not found' }
  }

  const { error, userId } = await verifyAccess(document.caseId, true)
  if (error) return { success: false, error }

  await prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: { id: documentId },
      data: {
        deletedAt: new Date(),
        deletedByUserId: userId,
      },
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: userId!,
        action: 'DELETE',
        objectType: 'Document',
        objectId: documentId,
      },
    })
  })

  // Note: We don't delete the file from storage to allow recovery

  revalidatePath(`/case/${document.caseId}/documents`)
  return { success: true }
}

// ============================================================================
// MEDIA ITEMS
// ============================================================================

export interface MediaItemWithMeta {
  id: string
  kind: string
  mimeType: string
  size: number
  url: string
  createdAt: Date
  bodyLocation: string | null
}

export async function getMediaForEvent(eventId: string): Promise<MediaItemWithMeta[]> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  })

  if (!event) return []

  const { error } = await verifyAccess(event.caseId)
  if (error) return []

  const mediaItems = await prisma.mediaItem.findMany({
    where: {
      eventId,
      deletedAt: null,
    },
    orderBy: { createdAt: 'asc' },
  })

  const storage = getStorage()

  return mediaItems.map((item) => ({
    id: item.id,
    kind: item.kind,
    mimeType: item.mimeType,
    size: item.size,
    url: storage.getUrl(item.storagePath),
    createdAt: item.createdAt,
    bodyLocation: item.bodyLocation,
  }))
}

export async function deleteMediaItem(mediaItemId: string): Promise<ActionResult> {
  const mediaItem = await prisma.mediaItem.findUnique({
    where: { id: mediaItemId },
    include: { event: true },
  })

  if (!mediaItem) {
    return { success: false, error: 'Media not found' }
  }

  const { error, userId } = await verifyAccess(mediaItem.event.caseId, true)
  if (error) return { success: false, error }

  await prisma.$transaction(async (tx) => {
    await tx.mediaItem.update({
      where: { id: mediaItemId },
      data: { deletedAt: new Date() },
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: userId!,
        action: 'DELETE',
        objectType: 'MediaItem',
        objectId: mediaItemId,
      },
    })
  })

  revalidatePath(`/case/${mediaItem.event.caseId}/today`)
  return { success: true }
}
