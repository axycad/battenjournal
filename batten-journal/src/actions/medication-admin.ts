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

export interface MedicationWithAdministrations {
  id: string
  name: string
  dose: string | null
  route: string | null
  schedule: string | null
  isPRN: boolean
  active: boolean
  reminderEnabled: boolean
  reminderTimes: string[] | null
  lastAdministration: {
    givenAt: Date
    givenBy: string | null
    dose: string | null
  } | null
  todayCount: number
}

export interface AdministrationRecord {
  id: string
  medicationId: string
  medicationName: string
  givenAt: Date
  givenBy: {
    id: string
    name: string | null
  }
  dose: string | null
  route: string | null
  notes: string | null
  prnReason: string | null
  skipped: boolean
  skipReason: string | null
}

export interface AdministrationInput {
  caseId: string
  medicationId: string
  givenAt?: Date
  dose?: string
  route?: string
  notes?: string
  prnReason?: string
}

export interface SkipInput {
  caseId: string
  medicationId: string
  skipReason: string
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

  // Only parents can log medication administrations
  if (membership.memberType !== 'PARENT') {
    return { error: 'Only parents can log medication administration', membership: null }
  }

  return { error: null, membership, userId: session.user.id }
}

// ============================================================================
// GET MEDICATIONS WITH STATUS
// ============================================================================

export async function getMedicationsWithStatus(
  caseId: string
): Promise<MedicationWithAdministrations[]> {
  const { error } = await verifyCaseAccess(caseId)
  if (error) return []

  const medications = await prisma.medication.findMany({
    where: {
      caseId,
      active: true,
      deletedAt: null,
    },
    orderBy: [{ isPRN: 'asc' }, { name: 'asc' }],
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const results: MedicationWithAdministrations[] = []

  for (const med of medications) {
    // Get last administration
    const lastAdmin = await prisma.medicationAdministration.findFirst({
      where: {
        medicationId: med.id,
        deletedAt: null,
        skipped: false,
      },
      orderBy: { givenAt: 'desc' },
      include: {
        givenBy: { select: { name: true } },
      },
    })

    // Count today's administrations
    const todayCount = await prisma.medicationAdministration.count({
      where: {
        medicationId: med.id,
        givenAt: { gte: today },
        deletedAt: null,
        skipped: false,
      },
    })

    results.push({
      id: med.id,
      name: med.name,
      dose: med.dose,
      route: med.route,
      schedule: med.schedule,
      isPRN: med.isPRN,
      active: med.active,
      reminderEnabled: med.reminderEnabled,
      reminderTimes: med.reminderTimes ? JSON.parse(med.reminderTimes) : null,
      lastAdministration: lastAdmin
        ? {
            givenAt: lastAdmin.givenAt,
            givenBy: lastAdmin.givenBy.name,
            dose: lastAdmin.dose,
          }
        : null,
      todayCount,
    })
  }

  return results
}

// ============================================================================
// LOG ADMINISTRATION
// ============================================================================

export async function logMedicationAdministration(
  input: AdministrationInput
): Promise<ActionResult<{ id: string }>> {
  const { error, userId } = await verifyCaseAccess(input.caseId)
  if (error) return { success: false, error }

  // Verify medication belongs to case
  const medication = await prisma.medication.findFirst({
    where: {
      id: input.medicationId,
      caseId: input.caseId,
      deletedAt: null,
    },
  })

  if (!medication) {
    return { success: false, error: 'Medication not found' }
  }

  // For PRN medications, require a reason
  if (medication.isPRN && !input.prnReason) {
    return { success: false, error: 'PRN reason is required' }
  }

  const administration = await prisma.medicationAdministration.create({
    data: {
      caseId: input.caseId,
      medicationId: input.medicationId,
      givenAt: input.givenAt || new Date(),
      givenById: userId!,
      dose: input.dose || medication.dose,
      route: input.route || medication.route,
      notes: input.notes?.trim() || null,
      prnReason: input.prnReason?.trim() || null,
    },
  })

  // Create audit entry
  await prisma.auditEntry.create({
    data: {
      caseId: input.caseId,
      actorUserId: userId!,
      action: 'EDIT',
      objectType: 'MedicationAdministration',
      objectId: administration.id,
      metadata: {
        medicationName: medication.name,
        dose: administration.dose,
      },
    },
  })

  revalidatePath(`/case/${input.caseId}`)
  return { success: true, data: { id: administration.id } }
}

// ============================================================================
// SKIP MEDICATION
// ============================================================================

export async function skipMedication(input: SkipInput): Promise<ActionResult<{ id: string }>> {
  const { error, userId } = await verifyCaseAccess(input.caseId)
  if (error) return { success: false, error }

  if (!input.skipReason.trim()) {
    return { success: false, error: 'Skip reason is required' }
  }

  // Verify medication belongs to case
  const medication = await prisma.medication.findFirst({
    where: {
      id: input.medicationId,
      caseId: input.caseId,
      deletedAt: null,
    },
  })

  if (!medication) {
    return { success: false, error: 'Medication not found' }
  }

  const administration = await prisma.medicationAdministration.create({
    data: {
      caseId: input.caseId,
      medicationId: input.medicationId,
      givenAt: new Date(),
      givenById: userId!,
      skipped: true,
      skipReason: input.skipReason.trim(),
    },
  })

  revalidatePath(`/case/${input.caseId}`)
  return { success: true, data: { id: administration.id } }
}

// ============================================================================
// GET ADMINISTRATION HISTORY
// ============================================================================

export async function getAdministrationHistory(
  caseId: string,
  options?: {
    medicationId?: string
    limit?: number
    startDate?: Date
    endDate?: Date
  }
): Promise<AdministrationRecord[]> {
  const { error } = await verifyCaseAccess(caseId)
  if (error) return []

  const administrations = await prisma.medicationAdministration.findMany({
    where: {
      caseId,
      deletedAt: null,
      ...(options?.medicationId && { medicationId: options.medicationId }),
      ...(options?.startDate && { givenAt: { gte: options.startDate } }),
      ...(options?.endDate && { givenAt: { lte: options.endDate } }),
    },
    include: {
      medication: { select: { name: true } },
      givenBy: { select: { id: true, name: true } },
    },
    orderBy: { givenAt: 'desc' },
    take: options?.limit || 50,
  })

  return administrations.map((a) => ({
    id: a.id,
    medicationId: a.medicationId,
    medicationName: a.medication.name,
    givenAt: a.givenAt,
    givenBy: a.givenBy,
    dose: a.dose,
    route: a.route,
    notes: a.notes,
    prnReason: a.prnReason,
    skipped: a.skipped,
    skipReason: a.skipReason,
  }))
}

// ============================================================================
// DELETE ADMINISTRATION
// ============================================================================

export async function deleteAdministration(
  administrationId: string
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const administration = await prisma.medicationAdministration.findUnique({
    where: { id: administrationId },
  })

  if (!administration || administration.deletedAt) {
    return { success: false, error: 'Record not found' }
  }

  // Verify user has access to this case
  const { error } = await verifyCaseAccess(administration.caseId)
  if (error) return { success: false, error }

  // Only allow deletion within 1 hour of creation
  const oneHourAgo = new Date()
  oneHourAgo.setHours(oneHourAgo.getHours() - 1)

  if (administration.createdAt < oneHourAgo) {
    return { success: false, error: 'Can only delete records within 1 hour of creation' }
  }

  await prisma.medicationAdministration.update({
    where: { id: administrationId },
    data: { deletedAt: new Date() },
  })

  revalidatePath(`/case/${administration.caseId}`)
  return { success: true }
}

// ============================================================================
// UPDATE MEDICATION REMINDERS
// ============================================================================

export async function updateMedicationReminders(
  medicationId: string,
  enabled: boolean,
  times?: string[]
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const medication = await prisma.medication.findUnique({
    where: { id: medicationId },
  })

  if (!medication || medication.deletedAt) {
    return { success: false, error: 'Medication not found' }
  }

  const { error } = await verifyCaseAccess(medication.caseId)
  if (error) return { success: false, error }

  await prisma.medication.update({
    where: { id: medicationId },
    data: {
      reminderEnabled: enabled,
      reminderTimes: times ? JSON.stringify(times) : null,
    },
  })

  revalidatePath(`/case/${medication.caseId}`)
  return { success: true }
}

// ============================================================================
// GET TODAY'S SCHEDULE
// ============================================================================

export async function getTodaysMedicationSchedule(
  caseId: string
): Promise<{
  scheduled: {
    medication: MedicationWithAdministrations
    times: string[]
    givenTimes: string[]
  }[]
  prn: MedicationWithAdministrations[]
}> {
  const medications = await getMedicationsWithStatus(caseId)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const scheduled: {
    medication: MedicationWithAdministrations
    times: string[]
    givenTimes: string[]
  }[] = []

  const prn: MedicationWithAdministrations[] = []

  for (const med of medications) {
    if (med.isPRN) {
      prn.push(med)
    } else if (med.reminderEnabled && med.reminderTimes && med.reminderTimes.length > 0) {
      // Get administrations for today
      const todayAdmins = await prisma.medicationAdministration.findMany({
        where: {
          medicationId: med.id,
          givenAt: { gte: today },
          deletedAt: null,
          skipped: false,
        },
        select: { givenAt: true },
      })

      const givenTimes = todayAdmins.map((a) =>
        a.givenAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      )

      scheduled.push({
        medication: med,
        times: med.reminderTimes,
        givenTimes,
      })
    }
  }

  return { scheduled, prn }
}
