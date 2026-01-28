'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import {
  getNotifications as getNotificationsLib,
  getUnreadNotifications as getUnreadNotificationsLib,
  markNotificationRead as markNotificationReadLib,
  deleteNotification as deleteNotificationLib,
} from '@/lib/notifications'

export type ActionResult<T = void> = {
  success: boolean
  error?: string
  data?: T
}

export interface NotificationData {
  id: string
  type: string
  title: string
  body: string
  actionUrl: string | null
  metadata: unknown
  readAt: Date | null
  createdAt: Date
}

export async function getNotifications(options?: {
  limit?: number
}): Promise<NotificationData[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const notifications = await getNotificationsLib(session.user.id, options)

  return notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    actionUrl: n.actionUrl,
    metadata: n.metadata,
    readAt: n.readAt,
    createdAt: n.createdAt,
  }))
}

export async function getUnreadNotifications(): Promise<NotificationData[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const notifications = await getUnreadNotificationsLib(session.user.id)

  return notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    actionUrl: n.actionUrl,
    metadata: n.metadata,
    readAt: n.readAt,
    createdAt: n.createdAt,
  }))
}

export async function getUnreadCount(): Promise<number> {
  const session = await auth()
  if (!session?.user?.id) return 0

  return await prisma.notification.count({
    where: {
      userId: session.user.id,
      readAt: null,
      deletedAt: null,
    },
  })
}

export async function markNotificationRead(
  notificationId: string
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify notification belongs to user
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  })

  if (!notification || notification.userId !== session.user.id) {
    return { success: false, error: 'Notification not found' }
  }

  await markNotificationReadLib(notificationId)

  revalidatePath('/notifications')
  return { success: true }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      readAt: null,
      deletedAt: null,
    },
    data: {
      readAt: new Date(),
    },
  })

  revalidatePath('/notifications')
  return { success: true }
}

export async function deleteNotification(notificationId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify notification belongs to user
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  })

  if (!notification || notification.userId !== session.user.id) {
    return { success: false, error: 'Notification not found' }
  }

  await deleteNotificationLib(notificationId)

  revalidatePath('/notifications')
  return { success: true }
}

export async function getUserReminderPreferences() {
  const session = await auth()
  if (!session?.user?.id) return null

  const prefs = await prisma.emailPreference.findUnique({
    where: { userId: session.user.id },
  })

  return prefs
}

export async function updateReminderPreferences(input: {
  medicationReminders?: boolean
  appointmentReminders?: boolean
  dailyLoggingNudges?: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
}): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  await prisma.emailPreference.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      medicationReminders: input.medicationReminders ?? true,
      appointmentReminders: input.appointmentReminders ?? true,
      dailyLoggingNudges: input.dailyLoggingNudges ?? false,
      quietHoursStart: input.quietHoursStart,
      quietHoursEnd: input.quietHoursEnd,
    },
    update: {
      ...(input.medicationReminders !== undefined && {
        medicationReminders: input.medicationReminders,
      }),
      ...(input.appointmentReminders !== undefined && {
        appointmentReminders: input.appointmentReminders,
      }),
      ...(input.dailyLoggingNudges !== undefined && {
        dailyLoggingNudges: input.dailyLoggingNudges,
      }),
      ...(input.quietHoursStart !== undefined && {
        quietHoursStart: input.quietHoursStart,
      }),
      ...(input.quietHoursEnd !== undefined && {
        quietHoursEnd: input.quietHoursEnd,
      }),
    },
  })

  revalidatePath('/settings/notifications')
  return { success: true }
}
