import { apiClient } from '@/lib/api-client'
import type { Event } from '@prisma/client'

// Re-export types
export type { Event }

export interface CreateEventInput {
  eventType: string
  occurredAt: Date
  severity?: number
  freeText?: string
  duration?: number
  medication?: string
  triggers?: string[]
  media?: Array<{ url: string; mimeType: string }>
}

export interface GetEventsOptions {
  limit?: number
  offset?: number
  eventType?: string
  startDate?: Date
  endDate?: Date
}

// Create a new event
export async function createEventAPI(
  caseId: string,
  input: CreateEventInput
): Promise<Event> {
  return apiClient.post('/api/sync/events', {
    caseId,
    ...input,
    occurredAt: input.occurredAt.toISOString(),
  })
}

// Get events for a case
export async function getEventsAPI(
  caseId: string,
  options?: GetEventsOptions
): Promise<Event[]> {
  const params = new URLSearchParams({ caseId })

  if (options?.limit) params.append('limit', options.limit.toString())
  if (options?.offset) params.append('offset', options.offset.toString())
  if (options?.eventType) params.append('eventType', options.eventType)
  if (options?.startDate) params.append('startDate', options.startDate.toISOString())
  if (options?.endDate) params.append('endDate', options.endDate.toISOString())

  return apiClient.get(`/api/sync/events?${params.toString()}`)
}

// Update an event
export async function updateEventAPI(
  eventId: string,
  updates: Partial<CreateEventInput>
): Promise<Event> {
  return apiClient.put(`/api/sync/events/${eventId}`, updates)
}

// Delete an event (soft delete)
export async function deleteEventAPI(eventId: string): Promise<void> {
  return apiClient.delete(`/api/sync/events/${eventId}`)
}

// Get all scopes
export interface Scope {
  id: string
  code: string
  label: string
  description?: string
}

export async function getAllScopesAPI(): Promise<Scope[]> {
  return apiClient.get('/api/scopes')
}
