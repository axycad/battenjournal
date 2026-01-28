import { notFound } from 'next/navigation'
import { Link } from '@/navigation'
import { auth } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { getCase } from '@/actions/case'
import { getAppointmentsForCase } from '@/actions/appointment'
import { AddAppointmentSection } from '../today/add-appointment-section'
import { format } from 'date-fns'
import { APPOINTMENT_TYPE_EMOJI, APPOINTMENT_TYPE_LABELS } from '@/lib/appointment-types'

export default async function AppointmentsPage({
  params,
}: {
  params: Promise<{ caseId: string; locale: string }>
}) {
  const session = await auth()
  const { caseId } = await params
  const t = await getTranslations('appointments')

  const caseData = await getCase(caseId)
  if (!caseData) {
    notFound()
  }

  const isParent = caseData.currentUserMemberType === 'PARENT'
  const canEdit = caseData.currentUserRole !== 'VIEWER' && isParent

  // Get all appointments
  const allAppointments = await getAppointmentsForCase(caseId)

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
  appointment: Awaited<ReturnType<typeof getAppointmentsForCase>>[0]
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
