'use client'

import { useState } from 'react'
import { Link } from '@/navigation'
import { type AppointmentWithCreator, updateAppointment } from '@/actions/appointment'
import { generateICSFile, downloadICSFile, generateGoogleCalendarURL } from '@/lib/calendar-sync'
import { APPOINTMENT_TYPE_LABELS, APPOINTMENT_TYPE_EMOJI } from '@/lib/appointment-types'

interface UpcomingAppointmentsWidgetProps {
  appointments: AppointmentWithCreator[]
  caseId: string
  childName: string
  canEdit: boolean
}

export function UpcomingAppointmentsWidget({
  appointments,
  caseId,
  childName,
  canEdit,
}: UpcomingAppointmentsWidgetProps) {
  const [completing, setCompleting] = useState<string | null>(null)

  if (appointments.length === 0) {
    return null
  }

  const handleMarkComplete = async (appointmentId: string) => {
    setCompleting(appointmentId)
    try {
      await updateAppointment(appointmentId, { status: 'COMPLETED' })
    } catch (error) {
      console.error('Failed to mark appointment complete:', error)
      alert('Failed to update appointment')
    } finally {
      setCompleting(null)
    }
  }

  const handleDownloadICS = (appointment: AppointmentWithCreator) => {
    const icsContent = generateICSFile(appointment, childName)
    const filename = `${childName}-${appointment.title.replace(/\s+/g, '-')}.ics`
    downloadICSFile(icsContent, filename)
  }

  const handleOpenGoogleCalendar = (appointment: AppointmentWithCreator) => {
    const url = generateGoogleCalendarURL(appointment)
    window.open(url, '_blank')
  }

  const formatDateTime = (date: Date) => {
    const now = new Date()
    const appointmentDate = new Date(date)
    const diffDays = Math.floor(
      (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    const timeStr = appointmentDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })

    if (diffDays === 0) {
      return `Today at ${timeStr}`
    } else if (diffDays === 1) {
      return `Tomorrow at ${timeStr}`
    } else if (diffDays < 7) {
      const dayName = appointmentDate.toLocaleDateString('en-GB', { weekday: 'long' })
      return `${dayName} at ${timeStr}`
    } else {
      const dateStr = appointmentDate.toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
      })
      return `${dateStr} at ${timeStr}`
    }
  }

  const nextAppointment = appointments[0]
  const otherAppointments = appointments.slice(1, 3) // Show up to 3 more

  return (
    <div className="p-md bg-white border border-divider rounded-md">
      <div className="flex items-center justify-between mb-sm">
        <h3 className="text-body font-medium text-text-primary">Upcoming Appointments</h3>
        <Link
          href={`/case/${caseId}/appointments`}
          className="text-meta text-accent-primary hover:underline"
        >
          View all
        </Link>
      </div>

      {/* Next appointment - featured */}
      <div className="p-sm bg-accent-primary/5 border border-accent-primary/20 rounded-md mb-sm">
        <div className="flex items-start gap-sm">
          <span className="text-2xl">
            {APPOINTMENT_TYPE_EMOJI[nextAppointment.appointmentType] || '📅'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-sm">
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-text-primary truncate">
                  {nextAppointment.title}
                </p>
                <p className="text-meta text-text-secondary">
                  {formatDateTime(nextAppointment.scheduledAt)}
                </p>
              </div>
            </div>

            {nextAppointment.location && (
              <p className="text-meta text-text-secondary mt-xs">
                📍 {nextAppointment.location}
              </p>
            )}

            {nextAppointment.provider && (
              <p className="text-meta text-text-secondary">
                👤 {nextAppointment.provider}
              </p>
            )}

            <div className="flex flex-wrap gap-xs mt-sm">
              <button
                type="button"
                onClick={() => handleDownloadICS(nextAppointment)}
                className="px-sm py-1 text-caption border border-divider rounded-md hover:bg-bg-primary"
              >
                📅 Add to calendar
              </button>
              <button
                type="button"
                onClick={() => handleOpenGoogleCalendar(nextAppointment)}
                className="px-sm py-1 text-caption border border-divider rounded-md hover:bg-bg-primary"
              >
                Google Calendar
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleMarkComplete(nextAppointment.id)}
                  disabled={completing === nextAppointment.id}
                  className="px-sm py-1 text-caption border border-divider rounded-md hover:bg-bg-primary disabled:opacity-50"
                >
                  {completing === nextAppointment.id ? 'Updating...' : '✓ Mark complete'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Other upcoming appointments - compact list */}
      {otherAppointments.length > 0 && (
        <div className="space-y-xs">
          {otherAppointments.map((apt) => (
            <div
              key={apt.id}
              className="flex items-center gap-sm p-xs border-b border-divider last:border-0"
            >
              <span className="text-lg">
                {APPOINTMENT_TYPE_EMOJI[apt.appointmentType] || '📅'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-meta text-text-primary truncate">{apt.title}</p>
                <p className="text-caption text-text-secondary">
                  {formatDateTime(apt.scheduledAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {appointments.length > 3 && (
        <p className="text-caption text-text-secondary mt-xs text-center">
          +{appointments.length - 3} more appointments
        </p>
      )}
    </div>
  )
}
