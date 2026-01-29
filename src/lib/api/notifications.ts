import { apiClient } from '@/lib/api-client'

export interface NotificationCounts {
  unreadMessages: number
  watchedUpdates: number
  overdueTasks: number
  pendingTasks: number
}

export interface CaseNotificationCounts {
  caseId: string
  caseName: string
  unreadMessages: number
  watchedUpdates: number
  overdueTasks: number
}

export interface NotificationItem {
  id: string
  type: 'message' | 'watched_update' | 'task_due' | 'task_assigned'
  caseId: string
  caseName: string
  title: string
  preview: string | null
  timestamp: Date
  link: string
  read: boolean
}

// Get notification counts for current user
export async function getNotificationCountsAPI(): Promise<NotificationCounts> {
  return apiClient.get('/api/notifications/counts')
}

// Get notification counts per case
export async function getNotificationCountsPerCaseAPI(): Promise<CaseNotificationCounts[]> {
  return apiClient.get('/api/notifications/counts-per-case')
}

// Get all notifications for current user
export async function getNotificationsAPI(
  options?: { limit?: number; offset?: number }
): Promise<NotificationItem[]> {
  const params = new URLSearchParams()
  if (options?.limit) params.append('limit', options.limit.toString())
  if (options?.offset) params.append('offset', options.offset.toString())

  const query = params.toString()
  return apiClient.get(`/api/notifications${query ? `?${query}` : ''}`)
}

// Mark notification as read
export async function markNotificationReadAPI(notificationId: string): Promise<void> {
  return apiClient.post(`/api/notifications/${notificationId}/read`)
}

// Mark all notifications as read
export async function markAllNotificationsReadAPI(): Promise<void> {
  return apiClient.post('/api/notifications/mark-all-read')
}
