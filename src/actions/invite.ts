'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { inviteSchema, type InviteInput } from '@/lib/validations'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = void> = {
  success: boolean
  error?: string
  data?: T
}

const INVITE_EXPIRY_DAYS = 7

export async function createInvite(
  input: InviteInput
): Promise<ActionResult<{ inviteLink: string }>> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const parsed = inviteSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { caseId, email, familyRole } = parsed.data
  const normalizedEmail = email.toLowerCase()

  // Verify user has OWNER_ADMIN role on this case
  const membership = await prisma.membership.findFirst({
    where: {
      caseId,
      userId: session.user.id,
      familyRole: 'OWNER_ADMIN',
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) {
    return { success: false, error: 'You do not have permission to invite members' }
  }

  // Check if user is already a member
  const existingMember = await prisma.membership.findFirst({
    where: {
      caseId,
      user: { email: normalizedEmail },
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (existingMember) {
    return { success: false, error: 'This person is already a member' }
  }

  // Check for existing pending invite
  const existingInvite = await prisma.invite.findFirst({
    where: {
      caseId,
      email: normalizedEmail,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  })

  if (existingInvite) {
    return { success: false, error: 'An invite has already been sent to this email' }
  }

  // Create invite
  const token = nanoid(32)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS)

  await prisma.invite.create({
    data: {
      caseId,
      email: normalizedEmail,
      familyRole: familyRole as 'OWNER_ADMIN' | 'EDITOR' | 'VIEWER',
      token,
      invitedById: session.user.id,
      expiresAt,
    },
  })

  // Audit
  await prisma.auditEntry.create({
    data: {
      actorUserId: session.user.id,
      action: 'GRANT',
      objectType: 'Invite',
      objectId: caseId,
      metadata: { email: normalizedEmail, role: familyRole },
    },
  })

  const baseUrl = process.env.AUTH_URL || 'http://localhost:5000'
  const inviteLink = `${baseUrl}/invite/${token}`

  revalidatePath(`/case/${caseId}/settings`)
  return { success: true, data: { inviteLink } }
}

export async function acceptInvite(
  token: string
): Promise<ActionResult<{ caseId: string }>> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Please log in or register to accept this invite' }
  }

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { case: true },
  })

  if (!invite) {
    return { success: false, error: 'Invite not found' }
  }

  if (invite.acceptedAt) {
    return { success: false, error: 'This invite has already been used' }
  }

  if (invite.expiresAt < new Date()) {
    return { success: false, error: 'This invite has expired' }
  }

  // Get current user email
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) {
    return { success: false, error: 'User not found' }
  }

  // Check email matches (case insensitive)
  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return {
      success: false,
      error: 'This invite was sent to a different email address',
    }
  }

  // Check not already a member
  const existingMembership = await prisma.membership.findFirst({
    where: {
      caseId: invite.caseId,
      userId: session.user.id,
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (existingMembership) {
    return { success: false, error: 'You are already a member of this case' }
  }

  // Create membership and mark invite as accepted
  await prisma.$transaction(async (tx) => {
    await tx.membership.create({
      data: {
        caseId: invite.caseId,
        userId: session.user.id,
        memberType: 'PARENT',
        familyRole: invite.familyRole,
      },
    })

    await tx.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: session.user.id,
        action: 'GRANT',
        objectType: 'Membership',
        objectId: invite.caseId,
        metadata: { inviteId: invite.id },
      },
    })
  })

  revalidatePath('/dashboard')
  return { success: true, data: { caseId: invite.caseId } }
}

export async function getPendingInvites(caseId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return []
  }

  // Verify user has access
  const membership = await prisma.membership.findFirst({
    where: {
      caseId,
      userId: session.user.id,
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) {
    return []
  }

  return prisma.invite.findMany({
    where: {
      caseId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      familyRole: true,
      expiresAt: true,
      createdAt: true,
    },
  })
}

export async function cancelInvite(inviteId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const invite = await prisma.invite.findUnique({
    where: { id: inviteId },
  })

  if (!invite) {
    return { success: false, error: 'Invite not found' }
  }

  // Verify user has OWNER_ADMIN role
  const membership = await prisma.membership.findFirst({
    where: {
      caseId: invite.caseId,
      userId: session.user.id,
      familyRole: 'OWNER_ADMIN',
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) {
    return { success: false, error: 'You do not have permission to cancel invites' }
  }

  // Delete the invite
  await prisma.invite.delete({
    where: { id: inviteId },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: session.user.id,
      action: 'REVOKE',
      objectType: 'Invite',
      objectId: invite.caseId,
      metadata: { email: invite.email },
    },
  })

  revalidatePath(`/case/${invite.caseId}/settings`)
  return { success: true }
}

export async function revokeMembership(
  membershipId: string
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const targetMembership = await prisma.membership.findUnique({
    where: { id: membershipId },
  })

  if (!targetMembership) {
    return { success: false, error: 'Membership not found' }
  }

  // Cannot revoke own membership
  if (targetMembership.userId === session.user.id) {
    return { success: false, error: 'You cannot remove yourself' }
  }

  // Verify user has OWNER_ADMIN role
  const actorMembership = await prisma.membership.findFirst({
    where: {
      caseId: targetMembership.caseId,
      userId: session.user.id,
      familyRole: 'OWNER_ADMIN',
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!actorMembership) {
    return { success: false, error: 'You do not have permission to remove members' }
  }

  // Soft revoke
  await prisma.membership.update({
    where: { id: membershipId },
    data: { revokedAt: new Date() },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: session.user.id,
      action: 'REVOKE',
      objectType: 'Membership',
      objectId: targetMembership.caseId,
      metadata: { revokedUserId: targetMembership.userId },
    },
  })

  revalidatePath(`/case/${targetMembership.caseId}/settings`)
  return { success: true }
}

export async function getInviteByToken(token: string) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: {
      case: {
        select: {
          childDisplayName: true,
        },
      },
      invitedBy: {
        select: {
          name: true,
        },
      },
    },
  })

  if (!invite) {
    return null
  }

  return {
    id: invite.id,
    email: invite.email,
    familyRole: invite.familyRole,
    expiresAt: invite.expiresAt,
    acceptedAt: invite.acceptedAt,
    childDisplayName: invite.case.childDisplayName,
    invitedByName: invite.invitedBy.name,
  }
}
