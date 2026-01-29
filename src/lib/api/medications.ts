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
