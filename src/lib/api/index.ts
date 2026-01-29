// Export all API modules
export * from './events'
export * from './cases'
export * from './profile'
export * from './tasks'
export * from './documents'
export * from './notifications'
export * from './appointments'
export * from './clinical'
export * from './messaging'
export * from './medications'
export * from './invites'

// Re-export the API client and error class
export { apiClient, ApiError } from '../api-client'

// Auth functions
export async function requestPasswordResetAPI(email: string): Promise<{ success: boolean; error?: string }> {
  return apiClient.post('/api/auth/request-reset', { email }, { requireAuth: false })
}

export async function registerAPI(data: {
  email: string
  password: string
  name: string
}): Promise<{ success: boolean; userId?: string; error?: string }> {
  return apiClient.post('/api/auth/register', data, { requireAuth: false })
}

// Audit and access log functions
export async function getAccessSummaryAPI(caseId: string) {
  return apiClient.get(`/api/audit/access-summary?caseId=${caseId}`)
}

export async function getPermissionChangesAPI(caseId: string, options?: { limit?: number }) {
  const params = new URLSearchParams({ caseId })
  if (options?.limit) params.append('limit', options.limit.toString())
  return apiClient.get(`/api/audit/permission-changes?${params.toString()}`)
}

export async function getDocumentAccessLogAPI(caseId: string, options?: { limit?: number; cliniciansOnly?: boolean }) {
  const params = new URLSearchParams({ caseId })
  if (options?.limit) params.append('limit', options.limit.toString())
  if (options?.cliniciansOnly) params.append('cliniciansOnly', 'true')
  return apiClient.get(`/api/audit/document-access?${params.toString()}`)
}

export async function getExportHistoryAPI(caseId: string) {
  return apiClient.get(`/api/audit/export-history?caseId=${caseId}`)
}

// Server component aliases
export const getAccessSummary = getAccessSummaryAPI
export const getPermissionChanges = getPermissionChangesAPI
export const getDocumentAccessLog = getDocumentAccessLogAPI
export const getExportHistory = getExportHistoryAPI
