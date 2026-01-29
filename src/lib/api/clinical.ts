import { apiClient } from '@/lib/api-client'

// Clinical Notes
export interface ClinicalNote {
  id: string
  caseId: string
  content: string
  createdAt: Date
  updatedAt: Date
  authorId: string
  author: {
    id: string
    name: string | null
    email: string
  }
}

export async function getClinicalNotesAPI(caseId: string): Promise<ClinicalNote[]> {
  const params = new URLSearchParams({ caseId })
  return apiClient.get(`/api/clinical-notes?${params.toString()}`)
}

// Flags
export interface Flag {
  id: string
  caseId: string
  type: string
  description: string
  severity: string
  createdAt: Date
  raisedAt: Date
  resolvedAt: Date | null
  raisedById: string
  resolvedById: string | null
  raisedBy: {
    id: string
    name: string | null
    email: string
  }
  resolvedBy: {
    id: string
    name: string | null
    email: string
  } | null
}

export async function getFlagsAPI(
  caseId: string,
  options?: { includeResolved?: boolean }
): Promise<Flag[]> {
  const params = new URLSearchParams({ caseId })
  if (options?.includeResolved) params.append('includeResolved', 'true')
  return apiClient.get(`/api/flags?${params.toString()}`)
}

// Case Tasks
export interface CaseTask {
  id: string
  caseId: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: Date | null
  completedAt: Date | null
  createdAt: Date
  createdById: string
  assignedToId: string | null
  createdBy: {
    id: string
    name: string | null
    email: string
  }
  assignedTo: {
    id: string
    name: string | null
    email: string
  } | null
}

export async function getClinicalCaseTasksAPI(
  caseId: string,
  options?: { includeCompleted?: boolean }
): Promise<CaseTask[]> {
  const params = new URLSearchParams({ caseId })
  if (options?.includeCompleted) params.append('includeCompleted', 'true')
  return apiClient.get(`/api/tasks/case?${params.toString()}`)
}

// Watches
export interface Watch {
  id: string
  caseId: string
  userId: string
  scopeId: string
  lastViewedAt: Date
  createdAt: Date
  scope: {
    id: string
    code: string
    label: string
    description: string | null
  }
}

export async function getWatchesAPI(caseId: string): Promise<Watch[]> {
  const params = new URLSearchParams({ caseId })
  return apiClient.get(`/api/watches?${params.toString()}`)
}

// Watched Updates
export interface WatchedUpdate {
  scopeId: string
  lastViewedAt: Date
  newEventCount: number
  recentEvents: Array<{
    id: string
    eventType: string
    occurredAt: Date
    scopeId: string | null
    scope: {
      id: string
      code: string
      label: string
    } | null
  }>
}

export async function getWatchedUpdatesAPI(caseId: string): Promise<WatchedUpdate[]> {
  const params = new URLSearchParams({ caseId })
  return apiClient.get(`/api/watches/updates?${params.toString()}`)
}

// Available Scopes for Watching
export interface AvailableScope {
  id: string
  code: string
  label: string
  description: string | null
}

export async function getAvailableScopesForWatchAPI(caseId: string): Promise<AvailableScope[]> {
  const params = new URLSearchParams({ caseId })
  return apiClient.get(`/api/watches/available-scopes?${params.toString()}`)
}

// Clinicians
export interface Clinician {
  id: string
  caseId: string
  userId: string
  memberType: string
  specialty: string | null
  user: {
    id: string
    name: string | null
    email: string
  }
}

export async function getCliniciansAPI(caseId: string): Promise<Clinician[]> {
  const params = new URLSearchParams({ caseId })
  return apiClient.get(`/api/clinicians?${params.toString()}`)
}
