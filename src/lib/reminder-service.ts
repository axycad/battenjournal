/**
 * Reminder service - checks and sends medication and appointment reminders
 * Designed to be called by a cron job (e.g., every 5-15 minutes)
 */

import { prisma } from '@/lib/prisma'
import {
  createNotification,
  hasReminderBeenSent,
  logReminderSent,
  isInQuietHours,
  sendPushNotification,
} from '@/lib/notifications'

interface ReminderResult {
  sent: number
  skipped: number
  errors: number
}

/**
 * Process medication reminders
 */
export async function processMedicationReminders(): Promise<ReminderResult> {
  const result: ReminderResult = { sent: 0, skipped: 0, errors: 0 }

  // Get all active medications with reminders enabled
  const medications = await prisma.medication.findMany({
    where: {
      active: true,
      reminderEnabled: true,
      reminderTimes: { not: null },
      deletedAt: null,
    },
    include: {
      case: {
        select: {
          id: true,
          childDisplayName: true,
          memberships: {
            where: {
              memberType: 'PARENT',
              revokedAt: null,
              deletedAt: null,
            },
            include: {
              user: {
                include: {
                  emailPreferences: true,
                },
              },
            },
          },
        },
      },
    },
  })

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  for (const medication of medications) {
    try {
      if (!medication.reminderTimes) continue

      const reminderTimes: string[] = JSON.parse(medication.reminderTimes)

      // Check each reminder time
      for (const timeStr of reminderTimes) {
        const [hour, minute] = timeStr.split(':').map(Number)

        // Check if it's time for this reminder (within 15-minute window)
        const isTimeForReminder =
          Math.abs(currentHour - hour) === 0 &&
          Math.abs(currentMinute - minute) < 15

        if (!isTimeForReminder) continue

        // Send reminder to each parent member
        for (const membership of medication.case.memberships) {
          const userId = membership.user.id
          const prefs = membership.user.emailPreferences

          // Check if user wants medication reminders
          if (prefs && !prefs.medicationReminders) {
            result.skipped++
            continue
          }

          // Check quiet hours
          if (prefs && isInQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd)) {
            result.skipped++
            continue
          }

          // Check if already sent today
          const scheduledFor = new Date(now)
          scheduledFor.setHours(hour, minute, 0, 0)

          const alreadySent = await hasReminderBeenSent(
            userId,
            'MEDICATION',
            medication.id,
            scheduledFor
          )

          if (alreadySent) {
            result.skipped++
            continue
          }

          // Create notification
          const notification = await createNotification({
            userId,
            type: 'MEDICATION_REMINDER',
            title: `Medication Reminder: ${medication.name}`,
            body: `Time to give ${medication.name}${
              medication.dose ? ` (${medication.dose})` : ''
            } for ${medication.case.childDisplayName}`,
            actionUrl: `/case/${medication.caseId}/medications`,
            metadata: {
              medicationId: medication.id,
              caseId: medication.caseId,
            },
          })

          // Send push notification
          await sendPushNotification(userId, {
            userId,
            type: 'MEDICATION_REMINDER',
            title: notification.title,
            body: notification.body,
            actionUrl: notification.actionUrl || undefined,
          })

          // Log the reminder
          await logReminderSent(userId, 'MEDICATION', medication.id, scheduledFor)

          result.sent++
        }
      }
    } catch (error) {
      console.error(`Error processing medication reminder ${medication.id}:`, error)
      result.errors++
    }
  }

  return result
}

/**
 * Process appointment reminders
 */
export async function processAppointmentReminders(): Promise<ReminderResult> {
  const result: ReminderResult = { sent: 0, skipped: 0, errors: 0 }

  // Get upcoming appointments with reminders
  const now = new Date()
  const in7Days = new Date(now)
  in7Days.setDate(in7Days.getDate() + 7)

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ['SCHEDULED', 'RESCHEDULED'] },
      scheduledAt: {
        gte: now,
        lte: in7Days,
      },
      reminderTimes: { not: null },
      deletedAt: null,
    },
    include: {
      case: {
        select: {
          id: true,
          childDisplayName: true,
          memberships: {
            where: {
              memberType: 'PARENT',
              revokedAt: null,
              deletedAt: null,
            },
            include: {
              user: {
                include: {
                  emailPreferences: true,
                },
              },
            },
          },
        },
      },
    },
  })

  for (const appointment of appointments) {
    try {
      if (!appointment.reminderTimes) continue

      const reminderMinutes: number[] = JSON.parse(appointment.reminderTimes)
      const appointmentTime = new Date(appointment.scheduledAt)

      // Check each reminder offset
      for (const minutesBefore of reminderMinutes) {
        const reminderTime = new Date(appointmentTime)
        reminderTime.setMinutes(reminderTime.getMinutes() - minutesBefore)

        // Check if it's time for this reminder (within 15-minute window)
        const timeDiff = reminderTime.getTime() - now.getTime()
        const isTimeForReminder = timeDiff > 0 && timeDiff < 15 * 60 * 1000

        if (!isTimeForReminder) continue

        // Send reminder to each parent member
        for (const membership of appointment.case.memberships) {
          const userId = membership.user.id
          const prefs = membership.user.emailPreferences

          // Check if user wants appointment reminders
          if (prefs && !prefs.appointmentReminders) {
            result.skipped++
            continue
          }

          // Check quiet hours
          if (prefs && isInQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd)) {
            result.skipped++
            continue
          }

          // Check if already sent
          const alreadySent = await hasReminderBeenSent(
            userId,
            'APPOINTMENT',
            appointment.id,
            reminderTime
          )

          if (alreadySent) {
            result.skipped++
            continue
          }

          // Format time remaining
          let timeText = ''
          if (minutesBefore >= 1440) {
            const days = Math.floor(minutesBefore / 1440)
            timeText = `in ${days} day${days > 1 ? 's' : ''}`
          } else if (minutesBefore >= 60) {
            const hours = Math.floor(minutesBefore / 60)
            timeText = `in ${hours} hour${hours > 1 ? 's' : ''}`
          } else {
            timeText = `in ${minutesBefore} minute${minutesBefore > 1 ? 's' : ''}`
          }

          // Create notification
          const notification = await createNotification({
            userId,
            type: 'APPOINTMENT_REMINDER',
            title: `Appointment Reminder: ${appointment.title}`,
            body: `${appointment.title} for ${appointment.case.childDisplayName} ${timeText}${
              appointment.location ? ` at ${appointment.location}` : ''
            }`,
            actionUrl: `/case/${appointment.caseId}/today`,
            metadata: {
              appointmentId: appointment.id,
              caseId: appointment.caseId,
            },
          })

          // Send push notification
          await sendPushNotification(userId, {
            userId,
            type: 'APPOINTMENT_REMINDER',
            title: notification.title,
            body: notification.body,
            actionUrl: notification.actionUrl || undefined,
          })

          // Log the reminder
          await logReminderSent(userId, 'APPOINTMENT', appointment.id, reminderTime)

          result.sent++
        }
      }
    } catch (error) {
      console.error(`Error processing appointment reminder ${appointment.id}:`, error)
      result.errors++
    }
  }

  return result
}

/**
 * Process daily logging nudges (gentle encouragement, no guilt)
 */
export async function processDailyLoggingNudges(): Promise<ReminderResult> {
  const result: ReminderResult = { sent: 0, skipped: 0, errors: 0 }

  const now = new Date()
  const currentHour = now.getHours()

  // Only send nudges in the evening (7-9 PM)
  if (currentHour < 19 || currentHour >= 21) {
    return result
  }

  // Get all users who want daily nudges
  const users = await prisma.user.findMany({
    where: {
      emailPreferences: {
        dailyLoggingNudges: true,
      },
      deletedAt: null,
    },
    include: {
      emailPreferences: true,
      memberships: {
        where: {
          memberType: 'PARENT',
          revokedAt: null,
          deletedAt: null,
        },
        include: {
          case: {
            select: {
              id: true,
              childDisplayName: true,
            },
          },
        },
      },
    },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const user of users) {
    try {
      const prefs = user.emailPreferences

      // Check quiet hours
      if (prefs && isInQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd)) {
        result.skipped++
        continue
      }

      // Check each case they're a member of
      for (const membership of user.memberships) {
        const caseId = membership.case.id

        // Check if already sent today
        const scheduledFor = new Date(today)
        scheduledFor.setHours(19, 0, 0, 0)

        const alreadySent = await hasReminderBeenSent(
          user.id,
          'DAILY_LOGGING',
          caseId,
          scheduledFor
        )

        if (alreadySent) {
          result.skipped++
          continue
        }

        // Check if they've logged anything today
        const todayEvents = await prisma.event.findFirst({
          where: {
            caseId,
            authorUserId: user.id,
            occurredAt: { gte: today },
            deletedAt: null,
          },
        })

        // If they've already logged, don't nudge
        if (todayEvents) {
          result.skipped++
          continue
        }

        // Create gentle nudge notification
        const notification = await createNotification({
          userId: user.id,
          type: 'DAILY_LOGGING_NUDGE',
          title: `Gentle reminder for ${membership.case.childDisplayName}`,
          body: `Haven't logged anything today yet. No pressure - just checking in!`,
          actionUrl: `/case/${caseId}/today`,
          metadata: {
            caseId,
          },
        })

        // Send push notification
        await sendPushNotification(user.id, {
          userId: user.id,
          type: 'DAILY_LOGGING_NUDGE',
          title: notification.title,
          body: notification.body,
          actionUrl: notification.actionUrl || undefined,
        })

        // Log the reminder
        await logReminderSent(user.id, 'DAILY_LOGGING', caseId, scheduledFor)

        result.sent++
      }
    } catch (error) {
      console.error(`Error processing daily nudge for user ${user.id}:`, error)
      result.errors++
    }
  }

  return result
}

/**
 * Main function to process all reminders
 * Should be called by a cron job every 5-15 minutes
 */
export async function processAllReminders() {
  console.log('[REMINDERS] Starting reminder processing...')

  const [medicationResult, appointmentResult, dailyNudgeResult] = await Promise.all([
    processMedicationReminders(),
    processAppointmentReminders(),
    processDailyLoggingNudges(),
  ])

  const totalSent = medicationResult.sent + appointmentResult.sent + dailyNudgeResult.sent
  const totalSkipped = medicationResult.skipped + appointmentResult.skipped + dailyNudgeResult.skipped
  const totalErrors = medicationResult.errors + appointmentResult.errors + dailyNudgeResult.errors

  console.log('[REMINDERS] Processing complete:', {
    medication: medicationResult,
    appointment: appointmentResult,
    dailyNudge: dailyNudgeResult,
    total: { sent: totalSent, skipped: totalSkipped, errors: totalErrors },
  })

  return {
    medication: medicationResult,
    appointment: appointmentResult,
    dailyNudge: dailyNudgeResult,
    total: { sent: totalSent, skipped: totalSkipped, errors: totalErrors },
  }
}
