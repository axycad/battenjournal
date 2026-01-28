/**
 * Notification service for gentle reminders
 * Handles medication reminders, appointment reminders, and daily logging nudges
 */

import { prisma } from '@/lib/prisma'
import type { NotificationType } from '@prisma/client'

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  body: string
  actionUrl?: string
  metadata?: Record<string, unknown>
}

/**
 * Create an in-app notification
 */
export async function createNotification(input: CreateNotificationInput) {
  return await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl,
      metadata: input.metadata as any,
    },
  })
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string) {
  return await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  })
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string) {
  return await prisma.notification.findMany({
    where: {
      userId,
      readAt: null,
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

/**
 * Get all notifications for a user
 */
export async function getNotifications(userId: string, options?: { limit?: number }) {
  return await prisma.notification.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
  })
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
  return await prisma.notification.update({
    where: { id: notificationId },
    data: { deletedAt: new Date() },
  })
}

/**
 * Check if a reminder has already been sent
 */
export async function hasReminderBeenSent(
  userId: string,
  reminderType: string,
  referenceId: string,
  scheduledFor: Date
): Promise<boolean> {
  const existing = await prisma.reminderLog.findUnique({
    where: {
      userId_reminderType_referenceId_scheduledFor: {
        userId,
        reminderType,
        referenceId,
        scheduledFor,
      },
    },
  })

  return existing !== null
}

/**
 * Log that a reminder was sent
 */
export async function logReminderSent(
  userId: string,
  reminderType: string,
  referenceId: string,
  scheduledFor: Date
) {
  return await prisma.reminderLog.create({
    data: {
      userId,
      reminderType,
      referenceId,
      scheduledFor,
    },
  })
}

/**
 * Check if current time is within user's quiet hours
 */
export function isInQuietHours(quietHoursStart?: string | null, quietHoursEnd?: string | null): boolean {
  if (!quietHoursStart || !quietHoursEnd) return false

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute

  const [startHour, startMinute] = quietHoursStart.split(':').map(Number)
  const [endHour, endMinute] = quietHoursEnd.split(':').map(Number)
  const startTime = startHour * 60 + startMinute
  const endTime = endHour * 60 + endMinute

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime
  }

  // Handle same-day quiet hours (e.g., 12:00 to 14:00)
  return currentTime >= startTime && currentTime < endTime
}

/**
 * Send push notification (placeholder for future implementation)
 */
export async function sendPushNotification(userId: string, notification: CreateNotificationInput) {
  // Get user's devices with push tokens
  const devices = await prisma.device.findMany({
    where: {
      userId,
      pushToken: { not: null },
      deletedAt: null,
    },
  })

  // TODO: Implement actual push notification sending
  // For now, just log that we would send
  console.log(`[PUSH] Would send to ${devices.length} devices for user ${userId}:`, notification.title)

  // Future: Integrate with Firebase Cloud Messaging (FCM) for Android
  // Future: Integrate with Apple Push Notification Service (APNS) for iOS
  // Future: Integrate with Web Push API for web notifications
}
