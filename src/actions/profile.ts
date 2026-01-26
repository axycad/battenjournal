'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { 
  VisionStatus, 
  MobilityStatus, 
  CommunicationStatus, 
  FeedingStatus,
  AllergySeverity 
} from '@prisma/client'

export type ActionResult<T = void> = {
  success: boolean
  error?: string
  data?: T
}

// Helper to verify membership and get role
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

// ============================================================================
// PATIENT PROFILE
// ============================================================================

export interface UpdateProfileInput {
  legalName?: string
  dateOfBirth?: string
  sex?: string
  bloodType?: string
  nationalId?: string
  insuranceProvider?: string
  insuranceNumber?: string
  emergencyNotes?: string
}

export async function updateProfile(
  caseId: string,
  input: UpdateProfileInput
): Promise<ActionResult> {
  const { error, userId } = await verifyAccess(caseId, true)
  if (error) return { success: false, error }

  await prisma.patientProfile.update({
    where: { caseId },
    data: {
      legalName: input.legalName,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
      sex: input.sex,
      bloodType: input.bloodType,
      nationalId: input.nationalId,
      insuranceProvider: input.insuranceProvider,
      insuranceNumber: input.insuranceNumber,
      emergencyNotes: input.emergencyNotes,
    },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'EDIT',
      objectType: 'PatientProfile',
      objectId: caseId,
    },
  })

  revalidatePath(`/case/${caseId}`)
  return { success: true }
}

// ============================================================================
// BASELINE STATUS
// ============================================================================

export interface UpdateBaselineInput {
  visionStatus?: VisionStatus
  mobilityStatus?: MobilityStatus
  communicationStatus?: CommunicationStatus
  feedingStatus?: FeedingStatus
}

export async function updateBaseline(
  caseId: string,
  input: UpdateBaselineInput
): Promise<ActionResult> {
  const { error, userId } = await verifyAccess(caseId, true)
  if (error) return { success: false, error }

  const now = new Date()
  const updateData: Record<string, unknown> = {}

  if (input.visionStatus !== undefined) {
    updateData.visionStatus = input.visionStatus
    updateData.visionConfirmedAt = now
  }
  if (input.mobilityStatus !== undefined) {
    updateData.mobilityStatus = input.mobilityStatus
    updateData.mobilityConfirmedAt = now
  }
  if (input.communicationStatus !== undefined) {
    updateData.communicationStatus = input.communicationStatus
    updateData.communicationConfirmedAt = now
  }
  if (input.feedingStatus !== undefined) {
    updateData.feedingStatus = input.feedingStatus
    updateData.feedingConfirmedAt = now
  }

  await prisma.patientProfile.update({
    where: { caseId },
    data: updateData,
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'EDIT',
      objectType: 'PatientProfile',
      objectId: caseId,
      metadata: { fields: Object.keys(input) },
    },
  })

  revalidatePath(`/case/${caseId}`)
  return { success: true }
}

export async function confirmBaselineUnchanged(
  caseId: string,
  fields: ('vision' | 'mobility' | 'communication' | 'feeding')[]
): Promise<ActionResult> {
  const { error, userId } = await verifyAccess(caseId, true)
  if (error) return { success: false, error }

  const now = new Date()
  const updateData: Record<string, Date> = {}

  if (fields.includes('vision')) updateData.visionConfirmedAt = now
  if (fields.includes('mobility')) updateData.mobilityConfirmedAt = now
  if (fields.includes('communication')) updateData.communicationConfirmedAt = now
  if (fields.includes('feeding')) updateData.feedingConfirmedAt = now

  await prisma.patientProfile.update({
    where: { caseId },
    data: updateData,
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'EDIT',
      objectType: 'PatientProfile',
      objectId: caseId,
      metadata: { action: 'confirm_baseline', fields },
    },
  })

  revalidatePath(`/case/${caseId}`)
  return { success: true }
}

// ============================================================================
// MEASUREMENTS (Weight / Height)
// ============================================================================

export interface AddMeasurementInput {
  type: 'WEIGHT' | 'HEIGHT'
  value: number
  note?: string
}

export async function addMeasurement(
  caseId: string,
  input: AddMeasurementInput
): Promise<ActionResult> {
  const { error, userId } = await verifyAccess(caseId, true)
  if (error) return { success: false, error }

  const unit = input.type === 'WEIGHT' ? 'kg' : 'cm'
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    // Create measurement record
    await tx.measurement.create({
      data: {
        caseId,
        type: input.type,
        value: input.value,
        unit,
        measuredAt: now,
        enteredByUserId: userId!,
        note: input.note,
      },
    })

    // Update profile snapshot for emergency card
    const profileUpdate = input.type === 'WEIGHT'
      ? { weightKg: input.value, weightMeasuredAt: now }
      : { heightCm: input.value, heightMeasuredAt: now }

    await tx.patientProfile.update({
      where: { caseId },
      data: profileUpdate,
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: userId!,
        action: 'EDIT',
        objectType: 'Measurement',
        objectId: caseId,
        metadata: { type: input.type, value: input.value },
      },
    })
  })

  revalidatePath(`/case/${caseId}`)
  return { success: true }
}

export async function getMeasurementHistory(caseId: string, type: 'WEIGHT' | 'HEIGHT') {
  const { error } = await verifyAccess(caseId)
  if (error) return []

  return prisma.measurement.findMany({
    where: {
      caseId,
      type,
      deletedAt: null,
    },
    orderBy: { measuredAt: 'desc' },
    take: 20,
  })
}

// ============================================================================
// ALLERGIES
// ============================================================================

export interface AllergyInput {
  substance: string
  reaction?: string
  severity?: AllergySeverity
}

export async function addAllergy(
  caseId: string,
  input: AllergyInput
): Promise<ActionResult> {
  const { error, userId } = await verifyAccess(caseId, true)
  if (error) return { success: false, error }

  await prisma.allergy.create({
    data: {
      caseId,
      substance: input.substance,
      reaction: input.reaction,
      severity: input.severity,
    },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'EDIT',
      objectType: 'Allergy',
      objectId: caseId,
      metadata: { substance: input.substance },
    },
  })

  revalidatePath(`/case/${caseId}`)
  return { success: true }
}

export async function updateAllergy(
  allergyId: string,
  input: AllergyInput
): Promise<ActionResult> {
  const allergy = await prisma.allergy.findUnique({ where: { id: allergyId } })
  if (!allergy) return { success: false, error: 'Not found' }

  const { error, userId } = await verifyAccess(allergy.caseId, true)
  if (error) return { success: false, error }

  await prisma.allergy.update({
    where: { id: allergyId },
    data: {
      substance: input.substance,
      reaction: input.reaction,
      severity: input.severity,
    },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'EDIT',
      objectType: 'Allergy',
      objectId: allergyId,
    },
  })

  revalidatePath(`/case/${allergy.caseId}`)
  return { success: true }
}

export async function deleteAllergy(allergyId: string): Promise<ActionResult> {
  const allergy = await prisma.allergy.findUnique({ where: { id: allergyId } })
  if (!allergy) return { success: false, error: 'Not found' }

  const { error, userId } = await verifyAccess(allergy.caseId, true)
  if (error) return { success: false, error }

  await prisma.allergy.update({
    where: { id: allergyId },
    data: { deletedAt: new Date() },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'DELETE',
      objectType: 'Allergy',
      objectId: allergyId,
    },
  })

  revalidatePath(`/case/${allergy.caseId}`)
  return { success: true }
}

// ============================================================================
// MEDICATIONS
// ============================================================================

export interface MedicationInput {
  name: string
  dose?: string
  route?: string
  schedule?: string
  active?: boolean
}

export async function addMedication(
  caseId: string,
  input: MedicationInput
): Promise<ActionResult> {
  const { error, userId } = await verifyAccess(caseId, true)
  if (error) return { success: false, error }

  await prisma.medication.create({
    data: {
      caseId,
      name: input.name,
      dose: input.dose,
      route: input.route,
      schedule: input.schedule,
      active: input.active ?? true,
    },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'EDIT',
      objectType: 'Medication',
      objectId: caseId,
      metadata: { name: input.name },
    },
  })

  revalidatePath(`/case/${caseId}`)
  return { success: true }
}

export async function updateMedication(
  medicationId: string,
  input: MedicationInput
): Promise<ActionResult> {
  const medication = await prisma.medication.findUnique({ where: { id: medicationId } })
  if (!medication) return { success: false, error: 'Not found' }

  const { error, userId } = await verifyAccess(medication.caseId, true)
  if (error) return { success: false, error }

  await prisma.medication.update({
    where: { id: medicationId },
    data: {
      name: input.name,
      dose: input.dose,
      route: input.route,
      schedule: input.schedule,
      active: input.active,
    },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'EDIT',
      objectType: 'Medication',
      objectId: medicationId,
    },
  })

  revalidatePath(`/case/${medication.caseId}`)
  return { success: true }
}

export async function deleteMedication(medicationId: string): Promise<ActionResult> {
  const medication = await prisma.medication.findUnique({ where: { id: medicationId } })
  if (!medication) return { success: false, error: 'Not found' }

  const { error, userId } = await verifyAccess(medication.caseId, true)
  if (error) return { success: false, error }

  await prisma.medication.update({
    where: { id: medicationId },
    data: { deletedAt: new Date() },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'DELETE',
      objectType: 'Medication',
      objectId: medicationId,
    },
  })

  revalidatePath(`/case/${medication.caseId}`)
  return { success: true }
}

// ============================================================================
// CONDITIONS
// ============================================================================

export interface ConditionInput {
  name: string
  notes?: string
}

export async function addCondition(
  caseId: string,
  input: ConditionInput
): Promise<ActionResult> {
  const { error, userId } = await verifyAccess(caseId, true)
  if (error) return { success: false, error }

  await prisma.condition.create({
    data: {
      caseId,
      name: input.name,
      notes: input.notes,
    },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'EDIT',
      objectType: 'Condition',
      objectId: caseId,
    },
  })

  revalidatePath(`/case/${caseId}`)
  return { success: true }
}

export async function updateCondition(
  conditionId: string,
  input: ConditionInput
): Promise<ActionResult> {
  const condition = await prisma.condition.findUnique({ where: { id: conditionId } })
  if (!condition) return { success: false, error: 'Not found' }

  const { error, userId } = await verifyAccess(condition.caseId, true)
  if (error) return { success: false, error }

  await prisma.condition.update({
    where: { id: conditionId },
    data: {
      name: input.name,
      notes: input.notes,
    },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'EDIT',
      objectType: 'Condition',
      objectId: conditionId,
    },
  })

  revalidatePath(`/case/${condition.caseId}`)
  return { success: true }
}

export async function deleteCondition(conditionId: string): Promise<ActionResult> {
  const condition = await prisma.condition.findUnique({ where: { id: conditionId } })
  if (!condition) return { success: false, error: 'Not found' }

  const { error, userId } = await verifyAccess(condition.caseId, true)
  if (error) return { success: false, error }

  await prisma.condition.update({
    where: { id: conditionId },
    data: { deletedAt: new Date() },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'DELETE',
      objectType: 'Condition',
      objectId: conditionId,
    },
  })

  revalidatePath(`/case/${condition.caseId}`)
  return { success: true }
}

// ============================================================================
// CARE CONTACTS
// ============================================================================

export interface CareContactInput {
  role: string
  name: string
  phone?: string
  address?: string
}

export async function addCareContact(
  caseId: string,
  input: CareContactInput
): Promise<ActionResult> {
  const { error, userId } = await verifyAccess(caseId, true)
  if (error) return { success: false, error }

  await prisma.careContact.create({
    data: {
      caseId,
      role: input.role,
      name: input.name,
      phone: input.phone,
      address: input.address,
    },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'EDIT',
      objectType: 'CareContact',
      objectId: caseId,
    },
  })

  revalidatePath(`/case/${caseId}`)
  return { success: true }
}

export async function updateCareContact(
  contactId: string,
  input: CareContactInput
): Promise<ActionResult> {
  const contact = await prisma.careContact.findUnique({ where: { id: contactId } })
  if (!contact) return { success: false, error: 'Not found' }

  const { error, userId } = await verifyAccess(contact.caseId, true)
  if (error) return { success: false, error }

  await prisma.careContact.update({
    where: { id: contactId },
    data: {
      role: input.role,
      name: input.name,
      phone: input.phone,
      address: input.address,
    },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'EDIT',
      objectType: 'CareContact',
      objectId: contactId,
    },
  })

  revalidatePath(`/case/${contact.caseId}`)
  return { success: true }
}

export async function deleteCareContact(contactId: string): Promise<ActionResult> {
  const contact = await prisma.careContact.findUnique({ where: { id: contactId } })
  if (!contact) return { success: false, error: 'Not found' }

  const { error, userId } = await verifyAccess(contact.caseId, true)
  if (error) return { success: false, error }

  await prisma.careContact.update({
    where: { id: contactId },
    data: { deletedAt: new Date() },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'DELETE',
      objectType: 'CareContact',
      objectId: contactId,
    },
  })

  revalidatePath(`/case/${contact.caseId}`)
  return { success: true }
}

// ============================================================================
// CARE INTENT
// ============================================================================

export interface CareIntentInput {
  preferredHospital?: string
  emergencyPreferences?: string
  avoidList?: string
  communicationNotes?: string
  keyEquipment?: string
  showOnEmergencyCard?: boolean
}

export async function updateCareIntent(
  caseId: string,
  input: CareIntentInput
): Promise<ActionResult> {
  const { error, userId } = await verifyAccess(caseId, true)
  if (error) return { success: false, error }

  await prisma.careIntent.upsert({
    where: { caseId },
    update: {
      preferredHospital: input.preferredHospital,
      emergencyPreferences: input.emergencyPreferences,
      avoidList: input.avoidList,
      communicationNotes: input.communicationNotes,
      keyEquipment: input.keyEquipment,
      showOnEmergencyCard: input.showOnEmergencyCard,
      updatedByUserId: userId!,
    },
    create: {
      caseId,
      preferredHospital: input.preferredHospital,
      emergencyPreferences: input.emergencyPreferences,
      avoidList: input.avoidList,
      communicationNotes: input.communicationNotes,
      keyEquipment: input.keyEquipment,
      showOnEmergencyCard: input.showOnEmergencyCard ?? true,
      updatedByUserId: userId!,
    },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'EDIT',
      objectType: 'CareIntent',
      objectId: caseId,
    },
  })

  revalidatePath(`/case/${caseId}`)
  return { success: true }
}

// ============================================================================
// FULL PROFILE FETCH (for emergency card)
// ============================================================================

export async function getFullProfile(caseId: string) {
  const { error } = await verifyAccess(caseId)
  if (error) return null

  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      profile: true,
      careIntent: true,
      allergies: {
        where: { deletedAt: null },
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' },
        ],
      },
      medications: {
        where: { deletedAt: null, active: true },
        orderBy: { createdAt: 'desc' },
      },
      conditions: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      },
      careContacts: {
        where: { deletedAt: null },
        orderBy: { role: 'asc' },
      },
    },
  })

  return caseData
}
