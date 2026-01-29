import { apiClient } from '@/lib/api-client'

// Medication with status
export interface MedicationWithStatus {
  id: string
  caseId: string
  name: string
  dose: string | null
  route: string | null
  schedule: string | null
  active: boolean
  createdAt: Date
  lastAdministeredAt: Date | null
  lastAdministeredBy: string | null
}

export async function getMedicationsAPI(caseId: string): Promise<MedicationWithStatus[]> {
  const params = new URLSearchParams({ caseId })
  return apiClient.get(`/api/medications?${params.toString()}`)
}

// Administration history
export interface AdministrationRecord {
  id: string
  medicationId: string
  administeredAt: Date
  administeredByUserId: string
  notes: string | null
  medication: {
    id: string
    name: string
    dose: string | null
  }
  administeredBy: {
    id: string
    name: string | null
  }
}

export async function getAdministrationHistoryAPI(
  caseId: string,
  options?: { limit?: number }
): Promise<AdministrationRecord[]> {
  const params = new URLSearchParams({ caseId })
  if (options?.limit) params.append('limit', options.limit.toString())
  return apiClient.get(`/api/medications/history?${params.toString()}`)
}

// Log medication administration
export async function logMedicationAdministrationAPI(data: {
  medicationId: string
  administeredAt: Date
  notes?: string
}) {
  return apiClient.post('/api/medications/admin', data)
}

// Skip medication dose
export async function skipMedicationAPI(medicationId: string, reason?: string) {
  return apiClient.post(`/api/medications/${medicationId}/skip`, { reason })
}

// Delete administration record
export async function deleteAdministrationAPI(administrationId: string) {
  return apiClient.delete(`/api/medications/admin/${administrationId}`)
}

// Update medication reminders
export async function updateMedicationRemindersAPI(medicationId: string, reminders: any) {
  return apiClient.post(`/api/medications/${medicationId}/reminders`, { reminders })
}

// Aliases
export const logMedicationAdministration = logMedicationAdministrationAPI
export const skipMedication = skipMedicationAPI
export const deleteAdministration = deleteAdministrationAPI
export const updateMedicationReminders = updateMedicationRemindersAPI
