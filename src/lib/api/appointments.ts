import { apiClient } from '@/lib/api-client'

export type AppointmentType = 'CLINIC' | 'SPECIALIST' | 'THERAPY' | 'PROCEDURE' | 'OTHER'
export type AppointmentStatus = 'SCHEDULED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export interface Appointment {
  id: string
  caseId: string
  appointmentType: AppointmentType
  title: string
  notes?: string
  scheduledAt: Date
  duration?: number
  location?: string
  provider?: string
  reminderTimes?: number[]
  status: AppointmentStatus
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  cancelledAt?: Date
  createdBy: {
    id: string
    name: string | null
  }
}

export interface CreateAppointmentInput {
  appointmentType: AppointmentType
  title: string
  notes?: string
  scheduledAt: string // ISO date string
  duration?: number // minutes
  location?: string
  provider?: string
  reminderTimes?: number[] // Minutes before appointment
}

// Get upcoming appointments for a case
export async function getUpcomingAppointmentsAPI(
  caseId: string,
  options?: { limit?: number }
): Promise<Appointment[]> {
  const params = new URLSearchParams({ caseId })
  if (options?.limit) params.append('limit', options.limit.toString())

  return apiClient.get(`/api/appointments/upcoming?${params.toString()}`)
}

// Get all appointments for a case
export async function getAppointmentsAPI(
  caseId: string,
  options?: {
    fromDate?: Date
    toDate?: Date
    status?: AppointmentStatus[]
  }
): Promise<Appointment[]> {
  const params = new URLSearchParams({ caseId })
  if (options?.fromDate) params.append('fromDate', options.fromDate.toISOString())
  if (options?.toDate) params.append('toDate', options.toDate.toISOString())
  if (options?.status) params.append('status', options.status.join(','))

  return apiClient.get(`/api/appointments?${params.toString()}`)
}

// Create a new appointment
export async function createAppointmentAPI(
  caseId: string,
  input: CreateAppointmentInput
): Promise<{ appointmentId: string }> {
  return apiClient.post('/api/appointments', {
    caseId,
    ...input,
  })
}

// Update an appointment
export async function updateAppointmentAPI(
  appointmentId: string,
  updates: Partial<CreateAppointmentInput> & { status?: AppointmentStatus }
): Promise<void> {
  return apiClient.put(`/api/appointments/${appointmentId}`, updates)
}

// Delete an appointment
export async function deleteAppointmentAPI(appointmentId: string): Promise<void> {
  return apiClient.delete(`/api/appointments/${appointmentId}`)
}

// Mark appointment as completed
export async function completeAppointmentAPI(
  appointmentId: string,
  notes?: string
): Promise<void> {
  return apiClient.post(`/api/appointments/${appointmentId}/complete`, { notes })
}

// Cancel appointment
export async function cancelAppointmentAPI(
  appointmentId: string,
  reason?: string
): Promise<void> {
  return apiClient.post(`/api/appointments/${appointmentId}/cancel`, { reason })
}

// Aliases for compatibility
export const getUpcomingAppointments = getUpcomingAppointmentsAPI
export const getAppointments = getAppointmentsAPI
export const createAppointment = createAppointmentAPI
export const updateAppointment = updateAppointmentAPI
export const deleteAppointment = deleteAppointmentAPI
export const completeAppointment = completeAppointmentAPI
export const cancelAppointment = cancelAppointmentAPI
