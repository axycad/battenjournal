import { apiClient } from '@/lib/api-client'

export interface CaseData {
  id: string
  childDisplayName: string
  dateOfBirth: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreateCaseInput {
  childDisplayName: string
  dateOfBirth: Date
}

export interface UpdateCaseInput {
  childDisplayName?: string
  dateOfBirth?: Date
}

// Get all cases for the current user
export async function getCasesAPI(): Promise<CaseData[]> {
  return apiClient.get('/api/cases')
}

// Get a specific case by ID
export async function getCaseAPI(caseId: string): Promise<CaseData> {
  return apiClient.get(`/api/cases/${caseId}`)
}

// Create a new case
export async function createCaseAPI(input: CreateCaseInput): Promise<CaseData> {
  return apiClient.post('/api/cases', {
    ...input,
    dateOfBirth: input.dateOfBirth.toISOString(),
  })
}

// Update a case
export async function updateCaseAPI(
  caseId: string,
  updates: UpdateCaseInput
): Promise<CaseData> {
  return apiClient.put(`/api/cases/${caseId}`, {
    ...updates,
    dateOfBirth: updates.dateOfBirth?.toISOString(),
  })
}

// Delete a case
export async function deleteCaseAPI(caseId: string): Promise<void> {
  return apiClient.delete(`/api/cases/${caseId}`)
}
