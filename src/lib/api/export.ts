import { apiClient } from '@/lib/api-client'

export type ExportFormat = 'json' | 'csv'

export interface ExportOptions {
  caseId: string
  format: ExportFormat
  scopeCodes?: string[]
  startDate?: string
  endDate?: string
  includeMedia?: boolean
  includeDocuments?: boolean
}

export interface ExportBundle {
  id: string
  format: ExportFormat
  createdAt: string
  downloadUrl: string
  expiresAt: string
  events?: any[]
  metadata?: any
}

// Get available scopes for export
export async function getAvailableScopesForExportAPI(caseId: string): Promise<{ code: string; label: string; eventCount: number }[]> {
  return apiClient.get(`/api/export/scopes?caseId=${caseId}`)
}

// Create export
export async function createExportAPI(options: ExportOptions): Promise<{ success: boolean; data?: ExportBundle; error?: string }> {
  return apiClient.post('/api/export/create', options)
}

// Export to CSV
export async function exportToCSVAPI(events: any[]): Promise<string> {
  const response = await apiClient.post('/api/export/csv', { events })
  return response as any
}
