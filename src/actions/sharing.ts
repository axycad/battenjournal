'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = void> = {
  success: boolean
  error?: string
  data?: T
}

// Specialty definitions with default scope grants
// From system diagram section 6.3
export const SPECIALTIES = {
  gp: {
    label: 'GP / Primary Care',
    defaultScopes: ['infection', 'meds', 'feeding', 'sleep', 'comfort', 'care_admin'],
  },
  neurology: {
    label: 'Neurology',
    defaultScopes: ['seizures', 'meds', 'sleep', 'vision_comm', 'mobility', 'comfort'],
  },
  dermatology: {
    label: 'Dermatology / Wound Care',
    defaultScopes: ['skin_wounds', 'infection', 'meds', 'comfort'],
  },
  epilepsy_nurse: {
    label: 'Epilepsy Nurse',
    defaultScopes: ['seizures', 'meds', 'sleep', 'comfort'],
  },
  gastro: {
    label: 'Gastro / Dietetics / SLT',
    defaultScopes: ['feeding', 'infection', 'meds'],
  },
  physio: {
    label: 'Physio / OT',
    defaultScopes: ['mobility', 'comfort', 'care_admin'],
  },
  ophthalmology: {
    label: 'Ophthalmology',
    defaultScopes: ['vision_comm', 'mobility'],
  },
  palliative: {
    label: 'Palliative Care',
    defaultScopes: ['comfort', 'meds', 'feeding', 'sleep', 'care_admin'],
  },
  other: {
    label: 'Other Specialist',
    defaultScopes: ['care_admin'],
  },
} as const

export type Specialty = keyof typeof SPECIALTIES

const INVITE_EXPIRY_DAYS = 7

// Helper to verify admin access
async function verifyAdminAccess(caseId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Not authenticated', userId: null }
  }

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
    return { error: 'Admin access required', userId: null }
  }

  return { error: null, userId: session.user.id }
}

// ============================================================================
// CLINICIAN INVITE
// ============================================================================

export async function createClinicianInvite(
  caseId: string,
  email: string
): Promise<ActionResult<{ inviteLink: string }>> {
  const { error, userId } = await verifyAdminAccess(caseId)
  if (error) return { success: false, error }

  const normalizedEmail = email.toLowerCase()

  // Check if already a member
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
      inviteType: 'CLINICIAN',
      familyRole: null,
      token,
      invitedById: userId!,
      expiresAt,
    },
  })

  await prisma.auditEntry.create({
    data: {
      caseId,
      actorUserId: userId!,
      action: 'GRANT',
      objectType: 'Invite',
      objectId: caseId,
      metadata: { email: normalizedEmail, type: 'clinician' },
    },
  })

  const baseUrl = process.env.AUTH_URL || 'http://localhost:5000'
  const inviteLink = `${baseUrl}/invite/${token}`

  revalidatePath(`/case/${caseId}/sharing`)
  return { success: true, data: { inviteLink } }
}

// ============================================================================
// ACCEPT CLINICIAN INVITE
// ============================================================================

export async function acceptClinicianInvite(
  token: string,
  specialty: Specialty
): Promise<ActionResult<{ caseId: string }>> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Please log in to accept this invite' }
  }

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { case: true },
  })

  if (!invite) {
    return { success: false, error: 'Invite not found' }
  }

  if (invite.inviteType !== 'CLINICIAN') {
    return { success: false, error: 'Invalid invite type' }
  }

  if (invite.acceptedAt) {
    return { success: false, error: 'This invite has already been used' }
  }

  if (invite.expiresAt < new Date()) {
    return { success: false, error: 'This invite has expired' }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) {
    return { success: false, error: 'User not found' }
  }

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

  const specialtyConfig = SPECIALTIES[specialty]
  if (!specialtyConfig) {
    return { success: false, error: 'Invalid specialty' }
  }

  // Create membership, consent, and permission grants in transaction
  await prisma.$transaction(async (tx) => {
    // Update user role to clinician if not already
    if (user.role === 'PARENT') {
      await tx.user.update({
        where: { id: session.user.id },
        data: { role: 'CLINICIAN' },
      })
    }

    // Create membership as CARE_TEAM
    const membership = await tx.membership.create({
      data: {
        caseId: invite.caseId,
        userId: session.user.id,
        memberType: 'CARE_TEAM',
        familyRole: null,
      },
    })

    // Create clinical consent
    const consent = await tx.consent.create({
      data: {
        caseId: invite.caseId,
        consentType: 'CLINICAL',
        status: 'ACTIVE',
      },
    })

    // Get scope IDs for the specialty's default scopes
    const scopes = await tx.scope.findMany({
      where: { code: { in: specialtyConfig.defaultScopes } },
    })

    // Create permission grants for each scope
    if (scopes.length > 0) {
      await tx.permissionGrant.createMany({
        data: scopes.map((scope) => ({
          consentId: consent.id,
          membershipId: membership.id,
          scopeId: scope.id,
          accessMode: 'VIEW',
        })),
      })
    }

    // Update invite
    await tx.invite.update({
      where: { id: invite.id },
      data: {
        acceptedAt: new Date(),
        specialty,
      },
    })

    // Audit
    await tx.auditEntry.create({
      data: {
        actorUserId: session.user.id,
        action: 'GRANT',
        objectType: 'Membership',
        objectId: invite.caseId,
        metadata: { inviteId: invite.id, specialty, type: 'clinician' },
      },
    })
  })

  revalidatePath('/dashboard')
  return { success: true, data: { caseId: invite.caseId } }
}

// ============================================================================
// GET CLINICIAN'S GRANTED SCOPES
// ============================================================================

export async function getGrantedScopes(caseId: string): Promise<string[]> {
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

  // Parents see everything
  if (membership.memberType === 'PARENT') {
    const allScopes = await prisma.scope.findMany()
    return allScopes.map((s) => s.code)
  }

  // Get active consent and grants
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
    include: {
      scope: true,
    },
  })

  return grants.map((g) => g.scope.code)
}

// ============================================================================
// UPDATE CLINICIAN SCOPES (Admin only)
// ============================================================================

export async function updateClinicianScopes(
  caseId: string,
  clinicianUserId: string,
  scopeCodes: string[]
): Promise<ActionResult> {
  const { error, userId } = await verifyAdminAccess(caseId)
  if (error) return { success: false, error }

  // Get the clinician's membership
  const membership = await prisma.membership.findFirst({
    where: {
      caseId,
      userId: clinicianUserId,
      memberType: 'CARE_TEAM',
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) {
    return { success: false, error: 'Clinician membership not found' }
  }

  // Get active consent
  const consent = await prisma.consent.findFirst({
    where: {
      caseId,
      consentType: 'CLINICAL',
      status: 'ACTIVE',
      deletedAt: null,
    },
  })

  if (!consent) {
    return { success: false, error: 'No active consent found' }
  }

  await prisma.$transaction(async (tx) => {
    // Remove existing grants for this membership
    await tx.permissionGrant.deleteMany({
      where: {
        membershipId: membership.id,
        consentId: consent.id,
      },
    })

    // Create new grants
    if (scopeCodes.length > 0) {
      const scopes = await tx.scope.findMany({
        where: { code: { in: scopeCodes } },
      })

      if (scopes.length > 0) {
        await tx.permissionGrant.createMany({
          data: scopes.map((scope) => ({
            consentId: consent.id,
            membershipId: membership.id,
            scopeId: scope.id,
            accessMode: 'VIEW',
          })),
        })
      }
    }

    // Audit
    await tx.auditEntry.create({
      data: {
        caseId,
      actorUserId: userId!,
        action: 'EDIT',
        objectType: 'PermissionGrant',
        objectId: membership.id,
        metadata: { scopeCodes },
      },
    })
  })

  revalidatePath(`/case/${caseId}/sharing`)
  return { success: true }
}

// ============================================================================
// PAUSE/RESUME CONSENT
// ============================================================================

export async function pauseClinicianAccess(
  caseId: string,
  clinicianUserId: string
): Promise<ActionResult> {
  const { error, userId } = await verifyAdminAccess(caseId)
  if (error) return { success: false, error }

  const membership = await prisma.membership.findFirst({
    where: {
      caseId,
      userId: clinicianUserId,
      memberType: 'CARE_TEAM',
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) {
    return { success: false, error: 'Clinician membership not found' }
  }

  // Find consent with grants for this membership
  const grants = await prisma.permissionGrant.findMany({
    where: {
      membershipId: membership.id,
      deletedAt: null,
    },
    include: { consent: true },
  })

  const consentIds = [...new Set(grants.map((g) => g.consent.id))]

  await prisma.$transaction(async (tx) => {
    // Pause all related consents
    await tx.consent.updateMany({
      where: { id: { in: consentIds } },
      data: { status: 'PAUSED' },
    })

    await tx.auditEntry.create({
      data: {
        caseId,
      actorUserId: userId!,
        action: 'REVOKE',
        objectType: 'Consent',
        objectId: caseId,
        metadata: { clinicianUserId, action: 'pause' },
      },
    })
  })

  revalidatePath(`/case/${caseId}/sharing`)
  return { success: true }
}

export async function resumeClinicianAccess(
  caseId: string,
  clinicianUserId: string
): Promise<ActionResult> {
  const { error, userId } = await verifyAdminAccess(caseId)
  if (error) return { success: false, error }

  const membership = await prisma.membership.findFirst({
    where: {
      caseId,
      userId: clinicianUserId,
      memberType: 'CARE_TEAM',
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) {
    return { success: false, error: 'Clinician membership not found' }
  }

  const grants = await prisma.permissionGrant.findMany({
    where: {
      membershipId: membership.id,
      deletedAt: null,
    },
    include: { consent: true },
  })

  const consentIds = [...new Set(grants.map((g) => g.consent.id))]

  await prisma.$transaction(async (tx) => {
    await tx.consent.updateMany({
      where: { id: { in: consentIds } },
      data: { status: 'ACTIVE' },
    })

    await tx.auditEntry.create({
      data: {
        caseId,
      actorUserId: userId!,
        action: 'GRANT',
        objectType: 'Consent',
        objectId: caseId,
        metadata: { clinicianUserId, action: 'resume' },
      },
    })
  })

  revalidatePath(`/case/${caseId}/sharing`)
  return { success: true }
}

// ============================================================================
// REVOKE CLINICIAN ACCESS
// ============================================================================

export async function revokeClinicianAccess(
  caseId: string,
  clinicianUserId: string
): Promise<ActionResult> {
  const { error, userId } = await verifyAdminAccess(caseId)
  if (error) return { success: false, error }

  const membership = await prisma.membership.findFirst({
    where: {
      caseId,
      userId: clinicianUserId,
      memberType: 'CARE_TEAM',
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) {
    return { success: false, error: 'Clinician membership not found' }
  }

  await prisma.$transaction(async (tx) => {
    // Revoke membership
    await tx.membership.update({
      where: { id: membership.id },
      data: { revokedAt: new Date() },
    })

    // Revoke related consents
    const grants = await tx.permissionGrant.findMany({
      where: { membershipId: membership.id },
      include: { consent: true },
    })

    const consentIds = [...new Set(grants.map((g) => g.consent.id))]

    await tx.consent.updateMany({
      where: { id: { in: consentIds } },
      data: { status: 'REVOKED', revokedAt: new Date() },
    })

    await tx.auditEntry.create({
      data: {
        caseId,
      actorUserId: userId!,
        action: 'REVOKE',
        objectType: 'Membership',
        objectId: caseId,
        metadata: { clinicianUserId, type: 'clinician' },
      },
    })
  })

  revalidatePath(`/case/${caseId}/sharing`)
  return { success: true }
}

// ============================================================================
// GET SHARING STATUS FOR CASE
// ============================================================================

export interface ClinicianShare {
  membershipId: string
  userId: string
  userName: string | null
  userEmail: string
  specialty: string | null
  status: 'ACTIVE' | 'PAUSED' | 'REVOKED'
  grantedScopes: { code: string; label: string }[]
  addedAt: Date
}

export async function getCliniciansForCase(caseId: string): Promise<ClinicianShare[]> {
  const { error } = await verifyAdminAccess(caseId)
  if (error) return []

  const memberships = await prisma.membership.findMany({
    where: {
      caseId,
      memberType: 'CARE_TEAM',
      deletedAt: null,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      permissionGrants: {
        where: { deletedAt: null },
        include: {
          scope: true,
          consent: true,
        },
      },
    },
    orderBy: { addedAt: 'desc' },
  })

  // Get specialty from invite
  const invites = await prisma.invite.findMany({
    where: {
      caseId,
      inviteType: 'CLINICIAN',
      acceptedAt: { not: null },
    },
  })

  const specialtyByEmail = new Map(
    invites.map((i) => [i.email.toLowerCase(), i.specialty])
  )

  return memberships.map((m) => {
    const grants = m.permissionGrants
    const consent = grants[0]?.consent

    let status: 'ACTIVE' | 'PAUSED' | 'REVOKED' = 'ACTIVE'
    if (m.revokedAt) {
      status = 'REVOKED'
    } else if (consent?.status === 'PAUSED') {
      status = 'PAUSED'
    } else if (consent?.status === 'REVOKED') {
      status = 'REVOKED'
    }

    return {
      membershipId: m.id,
      userId: m.user.id,
      userName: m.user.name,
      userEmail: m.user.email,
      specialty: specialtyByEmail.get(m.user.email.toLowerCase()) || null,
      status,
      grantedScopes: grants.map((g) => ({
        code: g.scope.code,
        label: g.scope.label,
      })),
      addedAt: m.addedAt,
    }
  })
}

export async function getPendingClinicianInvites(caseId: string) {
  const { error } = await verifyAdminAccess(caseId)
  if (error) return []

  return prisma.invite.findMany({
    where: {
      caseId,
      inviteType: 'CLINICIAN',
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      expiresAt: true,
      createdAt: true,
    },
  })
}

export async function getClinicianInviteByToken(token: string) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: {
      case: {
        select: { childDisplayName: true },
      },
      invitedBy: {
        select: { name: true },
      },
    },
  })

  if (!invite || invite.inviteType !== 'CLINICIAN') {
    return null
  }

  return {
    id: invite.id,
    email: invite.email,
    expiresAt: invite.expiresAt,
    acceptedAt: invite.acceptedAt,
    childDisplayName: invite.case.childDisplayName,
    invitedByName: invite.invitedBy.name,
  }
}
