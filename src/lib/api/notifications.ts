import { apiClient } from '@/lib/api-client'

export type DigestFrequency = 'DAILY' | 'WEEKLY' | 'NEVER'

export interface EmailPreferences {
  digestFrequency: DigestFrequency
  watchAlerts: boolean
  taskReminders: boolean
  messageNotifications: boolean
}

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

// Get recent notifications (alias for getNotificationsAPI with limit)
export async function getRecentNotificationsAPI(limit: number = 50): Promise<NotificationItem[]> {
  return getNotificationsAPI({ limit })
}

// Get email preferences
export async function getEmailPreferencesAPI() {
  return apiClient.get('/api/notifications/email-preferences')
}

// Update email preferences
export async function updateEmailPreferencesAPI(preferences: any) {
  return apiClient.post('/api/notifications/email-preferences', preferences)
}

// Get user reminder preferences
export async function getUserReminderPreferencesAPI() {
  return apiClient.get('/api/notifications/reminder-preferences')
}

// Update user reminder preferences
export async function updateUserReminderPreferencesAPI(preferences: any) {
  return apiClient.post('/api/notifications/reminder-preferences', preferences)
}

// Unsubscribe by token
export async function unsubscribeByTokenAPI(token: string): Promise<{ success: boolean; error?: string }> {
  return apiClient.post('/api/notifications/unsubscribe', { token }, { requireAuth: false })
}

// Server component alias
export const unsubscribeByToken = unsubscribeByTokenAPI

// Update reminder preferences
export async function updateReminderPreferencesAPI(preferences: any) {
  return apiClient.post('/api/notifications/reminders', preferences)
}

// Alias
export const updateReminderPreferences = updateReminderPreferencesAPI
