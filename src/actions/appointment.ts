'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { AppointmentType, AppointmentStatus } from '@prisma/client'

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

export interface CreateAppointmentInput {
  appointmentType: AppointmentType
  title: string
  notes?: string
  scheduledAt: string // ISO date string
  duration?: number // minutes
  location?: string
  provider?: string
  reminderTimes?: number[] // Array of minutes before appointment, e.g., [1440, 60] for 24hr and 1hr
}

export async function createAppointment(
  caseId: string,
  input: CreateAppointmentInput
): Promise<ActionResult<{ appointmentId: string }>> {
  const { error, userId } = await verifyAccess(caseId, true)
  if (error) return { success: false, error }

  const appointment = await prisma.appointment.create({
    data: {
      caseId,
      createdByUserId: userId!,
      appointmentType: input.appointmentType,
      title: input.title,
      notes: input.notes,
      scheduledAt: new Date(input.scheduledAt),
      duration: input.duration,
      location: input.location,
      provider: input.provider,
      reminderTimes: input.reminderTimes ? JSON.stringify(input.reminderTimes) : null,
      status: 'SCHEDULED',
    },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'EDIT',
      objectType: 'Appointment',
      objectId: appointment.id,
      caseId,
    },
  })

  revalidatePath(`/case/${caseId}/today`)
  revalidatePath(`/case/${caseId}/appointments`)
  return { success: true, data: { appointmentId: appointment.id } }
}

export async function updateAppointment(
  appointmentId: string,
  input: Partial<CreateAppointmentInput> & { status?: AppointmentStatus }
): Promise<ActionResult> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  })
  if (!appointment) return { success: false, error: 'Appointment not found' }

  const { error, userId } = await verifyAccess(appointment.caseId, true)
  if (error) return { success: false, error }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      ...(input.appointmentType && { appointmentType: input.appointmentType }),
      ...(input.title && { title: input.title }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.scheduledAt && { scheduledAt: new Date(input.scheduledAt) }),
      ...(input.duration !== undefined && { duration: input.duration }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.provider !== undefined && { provider: input.provider }),
      ...(input.reminderTimes && { reminderTimes: JSON.stringify(input.reminderTimes) }),
      ...(input.status && {
        status: input.status,
        ...(input.status === 'COMPLETED' && { completedAt: new Date() }),
      }),
    },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'EDIT',
      objectType: 'Appointment',
      objectId: appointmentId,
      caseId: appointment.caseId,
    },
  })

  revalidatePath(`/case/${appointment.caseId}/today`)
  revalidatePath(`/case/${appointment.caseId}/appointments`)
  return { success: true }
}

export async function deleteAppointment(appointmentId: string): Promise<ActionResult> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  })
  if (!appointment) return { success: false, error: 'Appointment not found' }

  const { error, userId } = await verifyAccess(appointment.caseId, true)
  if (error) return { success: false, error }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { deletedAt: new Date() },
  })

  await prisma.auditEntry.create({
    data: {
      actorUserId: userId!,
      action: 'DELETE',
      objectType: 'Appointment',
      objectId: appointmentId,
      caseId: appointment.caseId,
    },
  })

  revalidatePath(`/case/${appointment.caseId}/today`)
  revalidatePath(`/case/${appointment.caseId}/appointments`)
  return { success: true }
}

export interface AppointmentWithCreator {
  id: string
  appointmentType: string
  title: string
  notes: string | null
  scheduledAt: Date
  duration: number | null
  location: string | null
  provider: string | null
  reminderTimes: number[] | null
  status: string
  completedAt: Date | null
  createdBy: {
    id: string
    name: string | null
  }
}

export async function getUpcomingAppointments(
  caseId: string,
  options?: { limit?: number }
): Promise<AppointmentWithCreator[]> {
  const { error } = await verifyAccess(caseId)
  if (error) return []

  const now = new Date()

  const appointments = await prisma.appointment.findMany({
    where: {
      caseId,
      deletedAt: null,
      scheduledAt: { gte: now },
      status: { in: ['SCHEDULED', 'RESCHEDULED'] },
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { scheduledAt: 'asc' },
    take: options?.limit || 10,
  })

  return appointments.map((apt) => ({
    ...apt,
    reminderTimes: apt.reminderTimes ? JSON.parse(apt.reminderTimes) : null,
  }))
}

export async function getAppointmentsForCase(
  caseId: string,
  options?: {
    fromDate?: Date
    toDate?: Date
    status?: AppointmentStatus[]
  }
): Promise<AppointmentWithCreator[]> {
  const { error } = await verifyAccess(caseId)
  if (error) return []

  const appointments = await prisma.appointment.findMany({
    where: {
      caseId,
      deletedAt: null,
      ...(options?.fromDate && { scheduledAt: { gte: options.fromDate } }),
      ...(options?.toDate && { scheduledAt: { lte: options.toDate } }),
      ...(options?.status && { status: { in: options.status } }),
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  return appointments.map((apt) => ({
    ...apt,
    reminderTimes: apt.reminderTimes ? JSON.parse(apt.reminderTimes) : null,
  }))
}

export async function getAppointment(appointmentId: string): Promise<AppointmentWithCreator | null> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
  })

  if (!appointment || appointment.deletedAt) return null

  const { error } = await verifyAccess(appointment.caseId)
  if (error) return null

  return {
    ...appointment,
    reminderTimes: appointment.reminderTimes ? JSON.parse(appointment.reminderTimes) : null,
  }
}
