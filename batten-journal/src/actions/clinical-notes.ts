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
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) {
    return { error: 'Access denied', membership: null }
  }

  // Check if clinician with active consent
  if (membership.memberType === 'CARE_TEAM') {
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
  }

  return { error: null, membership, userId: session.user.id }
}

// ============================================================================
// CLINICAL NOTES
// ============================================================================

export interface ClinicalNoteWithAuthor {
  id: string
  text: string
  visibility: 'TEAM_ONLY' | 'SHARE_WITH_PARENT'
  createdAt: Date
  author: {
    id: string
    name: string | null
  }
  eventId: string | null
  caseId: string | null
}

export async function createClinicalNote(input: {
  caseId: string
  eventId?: string
  text: string
  visibility?: 'TEAM_ONLY' | 'SHARE_WITH_PARENT'
}): Promise<ActionResult<{ noteId: string }>> {
  const { error, membership, userId } = await verifyClinicalAccess(input.caseId)
  if (error) return { success: false, error }

  // Only clinicians can create clinical notes
  if (membership!.memberType !== 'CARE_TEAM') {
    return { success: false, error: 'Only clinicians can create clinical notes' }
  }

  // If event-attached, verify event belongs to case
  if (input.eventId) {
    const event = await prisma.event.findFirst({
      where: {
        id: input.eventId,
        caseId: input.caseId,
        deletedAt: null,
      },
    })

    if (!event) {
      return { success: false, error: 'Event not found' }
    }
  }

  const note = await prisma.$transaction(async (tx) => {
    const newNote = await tx.clinicalNote.create({
      data: {
        caseId: input.caseId,
        eventId: input.eventId || null,
        authorUserId: userId!,
        visibility: input.visibility || 'TEAM_ONLY',
        text: input.text.trim(),
      },
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: userId!,
        action: 'EDIT',
        objectType: 'ClinicalNote',
        objectId: newNote.id,
        metadata: {
          eventId: input.eventId,
          visibility: input.visibility || 'TEAM_ONLY',
        },
      },
    })

    return newNote
  })

  revalidatePath(`/case/${input.caseId}`)
  return { success: true, data: { noteId: note.id } }
}

export async function getNotesForEvent(
  caseId: string,
  eventId: string
): Promise<ClinicalNoteWithAuthor[]> {
  const { error, membership } = await verifyClinicalAccess(caseId)
  if (error) return []

  const isParent = membership!.memberType === 'PARENT'

  const notes = await prisma.clinicalNote.findMany({
    where: {
      eventId,
      deletedAt: null,
      // Parents only see shared notes
      ...(isParent && { visibility: 'SHARE_WITH_PARENT' }),
    },
    include: {
      author: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return notes.map((note) => ({
    id: note.id,
    text: note.text,
    visibility: note.visibility,
    createdAt: note.createdAt,
    author: note.author,
    eventId: note.eventId,
    caseId: null,
  }))
}

export async function getCaseNotes(caseId: string): Promise<ClinicalNoteWithAuthor[]> {
  const { error, membership } = await verifyClinicalAccess(caseId)
  if (error) return []

  const isParent = membership!.memberType === 'PARENT'

  // Case-level notes have caseId but no eventId
  const notes = await prisma.clinicalNote.findMany({
    where: {
      caseId,
      eventId: null,
      deletedAt: null,
      ...(isParent && { visibility: 'SHARE_WITH_PARENT' }),
    },
    include: {
      author: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return notes.map((note) => ({
    id: note.id,
    text: note.text,
    visibility: note.visibility,
    createdAt: note.createdAt,
    author: note.author,
    eventId: null,
    caseId,
  }))
}

export async function deleteClinicalNote(noteId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const note = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
    include: { event: true },
  })

  if (!note) {
    return { success: false, error: 'Note not found' }
  }

  // Only author can delete their note
  if (note.authorUserId !== session.user.id) {
    return { success: false, error: 'Only the author can delete this note' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.clinicalNote.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: session.user.id,
        action: 'DELETE',
        objectType: 'ClinicalNote',
        objectId: noteId,
      },
    })
  })

  if (note.event) {
    revalidatePath(`/case/${note.event.caseId}`)
  }

  return { success: true }
}

export async function updateNoteVisibility(
  noteId: string,
  visibility: 'TEAM_ONLY' | 'SHARE_WITH_PARENT'
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const note = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
    include: { event: true },
  })

  if (!note) {
    return { success: false, error: 'Note not found' }
  }

  // Only author can change visibility
  if (note.authorUserId !== session.user.id) {
    return { success: false, error: 'Only the author can change visibility' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.clinicalNote.update({
      where: { id: noteId },
      data: { visibility },
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: session.user.id,
        action: 'EDIT',
        objectType: 'ClinicalNote',
        objectId: noteId,
        metadata: { visibility },
      },
    })
  })

  if (note.event) {
    revalidatePath(`/case/${note.event.caseId}`)
  }

  return { success: true }
}
