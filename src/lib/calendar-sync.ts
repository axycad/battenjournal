/**
 * Calendar sync utilities for generating .ics files
 * Compatible with Google Calendar, Apple Calendar, Outlook, etc.
 */

import type { AppointmentWithCreator } from '@/actions/appointment'

/**
 * Format date to iCalendar format (YYYYMMDDTHHMMSSZ)
 */
function formatICalDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

/**
 * Escape special characters for iCalendar format
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Generate a single .ics file for an appointment
 */
export function generateICSFile(
  appointment: AppointmentWithCreator,
  childName: string
): string {
  const startDate = new Date(appointment.scheduledAt)
  const endDate = new Date(startDate)

  // Add duration if specified, otherwise default to 1 hour
  const durationMinutes = appointment.duration || 60
  endDate.setMinutes(endDate.getMinutes() + durationMinutes)

  const now = new Date()

  // Build description
  let description = `${childName} - ${appointment.title}`
  if (appointment.notes) {
    description += `\\n\\nNotes: ${escapeICalText(appointment.notes)}`
  }
  if (appointment.provider) {
    description += `\\n\\nProvider: ${escapeICalText(appointment.provider)}`
  }

  // Build location
  const location = appointment.location ? escapeICalText(appointment.location) : ''

  // Build alarms (reminders)
  let alarms = ''
  if (appointment.reminderTimes && appointment.reminderTimes.length > 0) {
    appointment.reminderTimes.forEach((minutes) => {
      alarms += `
BEGIN:VALARM
TRIGGER:-PT${minutes}M
ACTION:DISPLAY
DESCRIPTION:Reminder: ${escapeICalText(appointment.title)}
END:VALARM`
    })
  }

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Batten Journal//Appointment Sync//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:appointment-${appointment.id}@battenjournal.app
DTSTAMP:${formatICalDate(now)}
DTSTART:${formatICalDate(startDate)}
DTEND:${formatICalDate(endDate)}
SUMMARY:${escapeICalText(appointment.title)}
DESCRIPTION:${description}
LOCATION:${location}
STATUS:${appointment.status === 'COMPLETED' ? 'CONFIRMED' : 'TENTATIVE'}
SEQUENCE:0${alarms}
END:VEVENT
END:VCALENDAR`

  return icsContent
}

/**
 * Generate a single .ics file with multiple appointments
 */
export function generateBulkICSFile(
  appointments: AppointmentWithCreator[],
  childName: string
): string {
  const now = new Date()

  const events = appointments.map((appointment) => {
    const startDate = new Date(appointment.scheduledAt)
    const endDate = new Date(startDate)
    const durationMinutes = appointment.duration || 60
    endDate.setMinutes(endDate.getMinutes() + durationMinutes)

    let description = `${childName} - ${appointment.title}`
    if (appointment.notes) {
      description += `\\n\\nNotes: ${escapeICalText(appointment.notes)}`
    }
    if (appointment.provider) {
      description += `\\n\\nProvider: ${escapeICalText(appointment.provider)}`
    }

    const location = appointment.location ? escapeICalText(appointment.location) : ''

    let alarms = ''
    if (appointment.reminderTimes && appointment.reminderTimes.length > 0) {
      appointment.reminderTimes.forEach((minutes) => {
        alarms += `
BEGIN:VALARM
TRIGGER:-PT${minutes}M
ACTION:DISPLAY
DESCRIPTION:Reminder: ${escapeICalText(appointment.title)}
END:VALARM`
      })
    }

    return `BEGIN:VEVENT
UID:appointment-${appointment.id}@battenjournal.app
DTSTAMP:${formatICalDate(now)}
DTSTART:${formatICalDate(startDate)}
DTEND:${formatICalDate(endDate)}
SUMMARY:${escapeICalText(appointment.title)}
DESCRIPTION:${description}
LOCATION:${location}
STATUS:${appointment.status === 'COMPLETED' ? 'CONFIRMED' : 'TENTATIVE'}
SEQUENCE:0${alarms}
END:VEVENT`
  })

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Batten Journal//Appointment Sync//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${events.join('\n')}
END:VCALENDAR`

  return icsContent
}

/**
 * Download an .ics file
 */
export function downloadICSFile(icsContent: string, filename: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Generate Google Calendar URL (opens in browser)
 */
export function generateGoogleCalendarURL(appointment: AppointmentWithCreator): string {
  const startDate = new Date(appointment.scheduledAt)
  const endDate = new Date(startDate)
  const durationMinutes = appointment.duration || 60
  endDate.setMinutes(endDate.getMinutes() + durationMinutes)

  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  let details = appointment.notes || ''
  if (appointment.provider) {
    details += (details ? '\n\n' : '') + `Provider: ${appointment.provider}`
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: appointment.title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details,
    location: appointment.location || '',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
