import { apiClient } from '@/lib/api-client'

export interface ProfileData {
  medications: Array<{
    id: string
    name: string
    dosage?: string
    frequency?: string
    startDate?: Date
    endDate?: Date
  }>
  allergies: Array<{
    id: string
    allergen: string
    severity?: string
    reaction?: string
  }>
  conditions: Array<{
    id: string
    name: string
    diagnosedAt?: Date
    notes?: string
  }>
  emergencyContacts: Array<{
    id: string
    name: string
    relationship?: string
    phone?: string
    email?: string
  }>
}

// Get profile data for a case
export async function getProfileAPI(caseId: string): Promise<ProfileData> {
  const params = new URLSearchParams({ caseId })
  return apiClient.get(`/api/sync/profile?${params.toString()}`)
}

// Update profile data (full sync)
export async function updateProfileAPI(
  caseId: string,
  profile: ProfileData
): Promise<ProfileData> {
  return apiClient.post('/api/sync/profile', {
    caseId,
    ...profile,
  })
}
