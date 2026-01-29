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

// Full profile data structure (used by profile page)
export interface FullProfileData {
  profile: {
    id: string
    caseId: string
    legalName: string | null
    dateOfBirth: Date | null
    sex: string | null
    bloodType: string | null
    nationalId: string | null
    insuranceProvider: string | null
    insuranceNumber: string | null
    emergencyNotes: string | null
    weightKg: number | null
    weightMeasuredAt: Date | null
    heightCm: number | null
    heightMeasuredAt: Date | null
    visionStatus: string | null
    visionConfirmedAt: Date | null
    mobilityStatus: string | null
    mobilityConfirmedAt: Date | null
    communicationStatus: string | null
    communicationConfirmedAt: Date | null
    feedingStatus: string | null
    feedingConfirmedAt: Date | null
  }
  careIntent: {
    id: string
    caseId: string
    preferredHospital: string | null
    emergencyPreferences: string | null
    avoidList: string | null
    communicationNotes: string | null
    keyEquipment: string | null
    showOnEmergencyCard: boolean
  } | null
  allergies: Array<{
    id: string
    caseId: string
    substance: string
    reaction: string | null
    severity: string | null
    createdAt: Date
  }>
  medications: Array<{
    id: string
    caseId: string
    name: string
    dose: string | null
    route: string | null
    schedule: string | null
    active: boolean
    createdAt: Date
  }>
  conditions: Array<{
    id: string
    caseId: string
    name: string
    notes: string | null
    createdAt: Date
  }>
  careContacts: Array<{
    id: string
    caseId: string
    role: string
    name: string
    phone: string | null
    address: string | null
    createdAt: Date
  }>
}

// Get full profile data (for profile page)
export async function getFullProfileAPI(caseId: string): Promise<FullProfileData> {
  const params = new URLSearchParams({ caseId })
  return apiClient.get(`/api/profile/full?${params.toString()}`)
}

// Allergy operations
export async function addAllergyAPI(caseId: string, data: { substance: string; reaction?: string; severity?: string }) {
  return apiClient.post('/api/profile/allergies', { caseId, ...data })
}

export async function updateAllergyAPI(allergyId: string, data: { substance?: string; reaction?: string; severity?: string }) {
  return apiClient.post(`/api/profile/allergies/${allergyId}`, data)
}

export async function deleteAllergyAPI(allergyId: string) {
  return apiClient.delete(`/api/profile/allergies/${allergyId}`)
}

// Medication operations
export async function addMedicationAPI(caseId: string, data: { name: string; dose?: string; route?: string; schedule?: string }) {
  return apiClient.post('/api/profile/medications', { caseId, ...data })
}

export async function updateMedicationAPI(medicationId: string, data: { name?: string; dose?: string; route?: string; schedule?: string; active?: boolean }) {
  return apiClient.post(`/api/profile/medications/${medicationId}`, data)
}

export async function deleteMedicationAPI(medicationId: string) {
  return apiClient.delete(`/api/profile/medications/${medicationId}`)
}

// Condition operations
export async function addConditionAPI(caseId: string, data: { name: string; notes?: string }) {
  return apiClient.post('/api/profile/conditions', { caseId, ...data })
}

export async function updateConditionAPI(conditionId: string, data: { name?: string; notes?: string }) {
  return apiClient.post(`/api/profile/conditions/${conditionId}`, data)
}

export async function deleteConditionAPI(conditionId: string) {
  return apiClient.delete(`/api/profile/conditions/${conditionId}`)
}

// Care contact operations
export async function addCareContactAPI(caseId: string, data: { role: string; name: string; phone?: string; address?: string }) {
  return apiClient.post('/api/profile/contacts', { caseId, ...data })
}

export async function updateCareContactAPI(contactId: string, data: { role?: string; name?: string; phone?: string; address?: string }) {
  return apiClient.post(`/api/profile/contacts/${contactId}`, data)
}

export async function deleteCareContactAPI(contactId: string) {
  return apiClient.delete(`/api/profile/contacts/${contactId}`)
}

// Measurements
export async function addMeasurementAPI(caseId: string, data: { weightKg?: number; heightCm?: number; measuredAt: Date }) {
  return apiClient.post('/api/profile/measurements', { caseId, ...data, measuredAt: data.measuredAt.toISOString() })
}

// Baseline status
export async function updateBaselineAPI(caseId: string, data: {
  visionStatus?: string
  mobilityStatus?: string
  communicationStatus?: string
  feedingStatus?: string
}) {
  return apiClient.post('/api/profile/baseline', { caseId, ...data })
}

export async function confirmBaselineUnchangedAPI(caseId: string) {
  return apiClient.post('/api/profile/baseline/confirm', { caseId })
}

// Care intent
export async function updateCareIntentAPI(caseId: string, data: {
  preferredHospital?: string
  emergencyPreferences?: string
  avoidList?: string
  communicationNotes?: string
  keyEquipment?: string
  showOnEmergencyCard?: boolean
}) {
  return apiClient.post('/api/profile/care-intent', { caseId, ...data })
}
