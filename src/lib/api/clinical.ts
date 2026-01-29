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

export interface ClinicalNoteWithAuthor {
  id: string
  text: string
  visibility: 'TEAM_ONLY' | 'SHARE_WITH_PARENT'
  createdAt: Date
  author: {
    id: string
    name: string | null
  }
  eventId: string | null
  caseId: string | null
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

export interface FlagWithDetails {
  id: string
  label: string
  status: 'OPEN' | 'RESOLVED'
  visibility: 'TEAM_ONLY' | 'SHARE_WITH_PARENT'
  anchorType: string
  anchorId: string
  createdAt: Date
  resolvedAt: Date | null
  createdBy: {
    id: string
    name: string | null
  }
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

// Get notes for a specific event
export async function getNotesForEventAPI(eventId: string): Promise<ClinicalNote[]> {
  return apiClient.get(`/api/clinical-notes/event/${eventId}`)
}

// Get flags for a specific event
export async function getFlagsForEventAPI(eventId: string): Promise<Flag[]> {
  return apiClient.get(`/api/flags/event/${eventId}`)
}

// Watch with scope details
export interface WatchWithScope extends Watch {
  scope: {
    id: string
    code: string
    label: string
    description: string | null
  }
}

// Create a watch
export async function createWatchAPI(caseId: string, scopeId: string): Promise<{ success: boolean; error?: string }> {
  return apiClient.post('/api/watches', { caseId, scopeId })
}

// Remove a watch
export async function removeWatchAPI(watchId: string): Promise<{ success: boolean; error?: string }> {
  return apiClient.delete(`/api/watches/${watchId}`)
}

// Create a flag
export async function createFlagAPI(data: {
  caseId: string
  label: string
  status: 'OPEN' | 'RESOLVED'
  visibility: 'TEAM_ONLY' | 'SHARE_WITH_PARENT'
  anchorType: string
  anchorId: string
}): Promise<{ flagId: string }> {
  return apiClient.post('/api/flags', data)
}

// Resolve a flag
export async function resolveFlagAPI(flagId: string): Promise<{ success: boolean }> {
  return apiClient.post(`/api/flags/${flagId}/resolve`)
}

// Reopen a flag
export async function reopenFlagAPI(flagId: string): Promise<{ success: boolean }> {
  return apiClient.post(`/api/flags/${flagId}/reopen`)
}

// Delete a flag
export async function deleteFlagAPI(flagId: string): Promise<{ success: boolean }> {
  return apiClient.delete(`/api/flags/${flagId}`)
}

// Create a clinical note
export async function createClinicalNoteAPI(data: {
  caseId?: string
  eventId?: string
  text: string
  visibility: 'TEAM_ONLY' | 'SHARE_WITH_PARENT'
}): Promise<{ noteId: string }> {
  return apiClient.post('/api/clinical-notes', data)
}

// Update note visibility
export async function updateNoteVisibilityAPI(
  noteId: string,
  visibility: 'TEAM_ONLY' | 'SHARE_WITH_PARENT'
): Promise<{ success: boolean }> {
  return apiClient.put(`/api/clinical-notes/${noteId}`, { visibility })
}

// Delete a clinical note
export async function deleteClinicalNoteAPI(noteId: string): Promise<{ success: boolean }> {
  return apiClient.delete(`/api/clinical-notes/${noteId}`)
}

// Aliases for compatibility
export const getClinicalNotes = getClinicalNotesAPI
export const getFlags = getFlagsAPI
export const getClinicalCaseTasks = getClinicalCaseTasksAPI
export const getWatches = getWatchesAPI
export const getWatchedUpdates = getWatchedUpdatesAPI
export const getAvailableScopesForWatch = getAvailableScopesForWatchAPI
export const getClinicians = getCliniciansAPI
export const getNotesForEvent = getNotesForEventAPI
export const getFlagsForEvent = getFlagsForEventAPI
export const createWatch = createWatchAPI
export const removeWatch = removeWatchAPI
export const createFlag = createFlagAPI
export const resolveFlag = resolveFlagAPI
export const reopenFlag = reopenFlagAPI
export const deleteFlag = deleteFlagAPI
export const createClinicalNote = createClinicalNoteAPI
export const updateNoteVisibility = updateNoteVisibilityAPI
export const deleteClinicalNote = deleteClinicalNoteAPI
