import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch profile for offline caching
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const caseId = searchParams.get('caseId')

  if (!caseId) {
    return NextResponse.json({ error: 'Case ID required' }, { status: 400 })
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
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Fetch case with profile data
  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      profile: true,
      allergies: { where: { deletedAt: null } },
      medications: { where: { deletedAt: null, active: true } },
      conditions: { where: { deletedAt: null } },
      careContacts: { where: { deletedAt: null } },
      careIntent: true,
    },
  })

  if (!caseData) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  return NextResponse.json({
    caseId: caseData.id,
    childDisplayName: caseData.childDisplayName,
    legalName: caseData.profile?.legalName,
    dateOfBirth: caseData.profile?.dateOfBirth,
    nhsNumber: caseData.profile?.nhsNumber,
    bloodType: caseData.profile?.bloodType,
    weightKg: caseData.profile?.weightKg,
    heightCm: caseData.profile?.heightCm,
    emergencyInstructions: caseData.profile?.emergencyInstructions,
    allergies: caseData.allergies.map((a) => ({
      id: a.id,
      substance: a.substance,
      severity: a.severity,
      reaction: a.reaction,
    })),
    medications: caseData.medications.map((m) => ({
      id: m.id,
      name: m.name,
      dose: m.dose,
      frequency: m.frequency,
      route: m.route,
      purpose: m.purpose,
      prescribedBy: m.prescribedBy,
    })),
    conditions: caseData.conditions.map((c) => ({
      id: c.id,
      name: c.name,
      diagnosedDate: c.diagnosedDate,
      notes: c.notes,
    })),
    careContacts: caseData.careContacts.map((c) => ({
      id: c.id,
      role: c.role,
      name: c.name,
      phone: c.phone,
      address: c.address,
    })),
    baselineVision: caseData.profile?.baselineVision,
    baselineMobility: caseData.profile?.baselineMobility,
    baselineCommunication: caseData.profile?.baselineCommunication,
    baselineFeeding: caseData.profile?.baselineFeeding,
    communicationNotes: caseData.careIntent?.communicationNotes,
    keyEquipment: caseData.careIntent?.keyEquipment,
    updatedAt: caseData.profile?.updatedAt || caseData.createdAt,
  })
}

// PUT - Update profile from offline queue (limited fields for emergency)
export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { caseId, localUpdatedAt, ...updates } = body

  if (!caseId) {
    return NextResponse.json({ error: 'Case ID required' }, { status: 400 })
  }

  // Verify membership and edit access
  const membership = await prisma.membership.findFirst({
    where: {
      caseId,
      userId: session.user.id,
      memberType: 'PARENT',
      familyRole: { in: ['OWNER_ADMIN', 'EDITOR'] },
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Get existing profile
  const existing = await prisma.patientProfile.findUnique({
    where: { caseId },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Conflict detection
  if (localUpdatedAt) {
    const localTime = new Date(localUpdatedAt).getTime()
    const serverTime = existing.updatedAt.getTime()

    if (serverTime > localTime) {
      // Fetch full profile for server version
      const fullCase = await prisma.case.findUnique({
        where: { id: caseId },
        include: {
          profile: true,
          allergies: { where: { deletedAt: null } },
          medications: { where: { deletedAt: null, active: true } },
          conditions: { where: { deletedAt: null } },
          careContacts: { where: { deletedAt: null } },
          careIntent: true,
        },
      })

      return NextResponse.json(
        {
          error: 'Conflict detected',
          serverVersion: {
            caseId: fullCase?.id,
            childDisplayName: fullCase?.childDisplayName,
            weightKg: fullCase?.profile?.weightKg,
            heightCm: fullCase?.profile?.heightCm,
            emergencyInstructions: fullCase?.profile?.emergencyInstructions,
            updatedAt: existing.updatedAt,
          },
        },
        { status: 409 }
      )
    }
  }

  // Limited fields allowed for offline update (emergency-critical)
  const allowedFields = [
    'weightKg',
    'heightCm',
    'emergencyInstructions',
    'communicationNotes',
    'keyEquipment',
  ]

  const profileUpdates: Record<string, unknown> = {}
  const intentUpdates: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      if (field === 'communicationNotes' || field === 'keyEquipment') {
        intentUpdates[field] = updates[field]
      } else {
        profileUpdates[field] = updates[field]
      }
    }
  }

  // Update in transaction
  await prisma.$transaction(async (tx) => {
    if (Object.keys(profileUpdates).length > 0) {
      await tx.patientProfile.update({
        where: { caseId },
        data: profileUpdates,
      })
    }

    if (Object.keys(intentUpdates).length > 0) {
      await tx.careIntent.upsert({
        where: { caseId },
        create: { caseId, ...intentUpdates },
        update: intentUpdates,
      })
    }

    await tx.auditEntry.create({
      data: {
        actorUserId: session.user.id,
        action: 'EDIT',
        objectType: 'PatientProfile',
        objectId: caseId,
        metadata: { source: 'offline_sync', fields: Object.keys(updates) },
      },
    })
  })

  return NextResponse.json({ success: true })
}
