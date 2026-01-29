'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Link } from '@/navigation'
import { useTranslations } from 'next-intl'
import { getCaseAPI, getAppointmentsAPI, type Appointment } from '@/lib/api'
import { AddAppointmentSection } from '../today/add-appointment-section'
import { format } from 'date-fns'
import { APPOINTMENT_TYPE_EMOJI, APPOINTMENT_TYPE_LABELS } from '@/lib/appointment-types'

interface CaseData {
  id: string
  childDisplayName: string
  currentUserRole: string
  currentUserMemberType: string
}

export default function AppointmentsPage() {
  const params = useParams()
  const caseId = params.caseId as string
  const t = useTranslations('appointments')

  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [caseDataRes, appointmentsRes] = await Promise.all([
          getCaseAPI(caseId),
          getAppointmentsAPI(caseId),
        ])

        setCaseData(caseDataRes as any)
        setAllAppointments(appointmentsRes)
      } catch (err) {
        console.error('Failed to load appointments:', err)
        setError('Failed to load appointments. Please refresh.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [caseId])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-md py-lg">
        <div className="flex items-center justify-center py-xl">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-md"></div>
            <p className="text-body text-text-secondary">Loading appointments...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="max-w-4xl mx-auto px-md py-lg">
        <div className="bg-red-50 border border-red-200 rounded-lg p-md">
          <p className="text-body text-red-700">{error || 'Case not found'}</p>
        </div>
      </div>
    )
  }

  const isParent = caseData.currentUserMemberType === 'PARENT'
  const canEdit = caseData.currentUserRole !== 'VIEWER' && isParent

  // Separate into upcoming and past
  const now = new Date()
  const upcoming = allAppointments.filter(
    (apt) => new Date(apt.scheduledAt) >= now && apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED'
  )
  const past = allAppointments.filter(
    (apt) => new Date(apt.scheduledAt) < now || apt.status === 'COMPLETED' || apt.status === 'CANCELLED'
  )

  return (
    <div className="max-w-4xl mx-auto px-md py-lg">
      {/* Header */}
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}/today`}
          className="text-meta text-purple-600 hover:text-purple-700 hover:underline"
        >
          ← Back to Today
        </Link>
        <h1 className="text-h2 font-bold text-text-primary mt-xs">Appointments</h1>
        <p className="text-meta text-text-secondary">
          Manage upcoming and past appointments
        </p>
      </div>

      {/* Add new appointment */}
      {canEdit && (
        <div className="mb-lg">
          <AddAppointmentSection caseId={caseId} />
        </div>
      )}

      {/* Upcoming Appointments */}
      <section className="mb-xl">
        <h2 className="text-h3 font-semibold text-text-primary mb-md">
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <div className="p-md bg-white border border-purple-100 rounded-lg shadow-sm text-center text-text-secondary">
            No upcoming appointments scheduled
          </div>
        ) : (
          <div className="space-y-sm">
            {upcoming.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                caseId={caseId}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}
      </section>

      {/* Past Appointments */}
      <section>
        <h2 className="text-h3 font-semibold text-text-primary mb-md">
          Past ({past.length})
        </h2>
        {past.length === 0 ? (
          <div className="p-md bg-white border border-purple-100 rounded-lg shadow-sm text-center text-text-secondary">
            No past appointments
          </div>
        ) : (
          <div className="space-y-sm">
            {past.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                caseId={caseId}
                canEdit={canEdit}
                isPast
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

interface AppointmentCardProps {
  appointment: Appointment
  caseId: string
  canEdit: boolean
  isPast?: boolean
}

function AppointmentCard({ appointment, caseId, canEdit, isPast }: AppointmentCardProps) {
  const scheduledDate = new Date(appointment.scheduledAt)
  const isCompleted = appointment.status === 'COMPLETED'
  const isCancelled = appointment.status === 'CANCELLED'

  return (
    <div
      className={`p-md bg-white border-2 rounded-lg shadow-sm ${
        isPast || isCompleted || isCancelled
          ? 'border-purple-100 opacity-75'
          : 'border-purple-300'
      }`}
    >
      <div className="flex items-start gap-sm">
        {/* Icon */}
        <span className="text-2xl">
          {APPOINTMENT_TYPE_EMOJI[appointment.appointmentType] || '📅'}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-sm mb-xs">
            <div className="flex-1 min-w-0">
              <h3 className="text-body font-medium text-text-primary">
                {appointment.title}
              </h3>
              <p className="text-meta text-text-secondary">
                {APPOINTMENT_TYPE_LABELS[appointment.appointmentType]}
              </p>
            </div>

            {/* Status badge */}
            {(isCompleted || isCancelled) && (
              <span
                className={`px-xs py-xxs text-meta rounded ${
                  isCompleted
                    ? 'bg-success-secondary text-success-primary'
                    : 'bg-error-secondary text-error-primary'
                }`}
              >
                {isCompleted ? 'Completed' : 'Cancelled'}
              </span>
            )}
          </div>

          {/* Date & Time */}
          <div className="text-meta text-text-secondary mb-xs">
            <time dateTime={appointment.scheduledAt.toISOString()}>
              {format(scheduledDate, 'EEEE, MMMM d, yyyy • h:mm a')}
            </time>
            {appointment.duration && (
              <span className="ml-xs">
                ({appointment.duration} min)
              </span>
            )}
          </div>

          {/* Location */}
          {appointment.location && (
            <p className="text-meta text-text-secondary mb-xs">
              📍 {appointment.location}
            </p>
          )}

          {/* Provider */}
          {appointment.provider && (
            <p className="text-meta text-text-secondary mb-xs">
              👤 {appointment.provider}
            </p>
          )}

          {/* Notes */}
          {appointment.notes && (
            <p className="text-meta text-text-secondary mt-sm">
              {appointment.notes}
            </p>
          )}

          {/* Actions */}
          {!isPast && !isCompleted && !isCancelled && (
            <div className="flex gap-xs mt-sm">
              <a
                href={`/api/appointments/${appointment.id}/calendar`}
                download={`${appointment.title}.ics`}
                className="text-meta text-purple-600 hover:text-purple-700 hover:underline font-medium"
              >
                📥 Download .ics
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
