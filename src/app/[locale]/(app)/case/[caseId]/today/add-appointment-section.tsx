'use client'

import { useState } from 'react'
import { AppointmentForm } from '@/components/appointments/appointment-form'

interface AddAppointmentSectionProps {
  caseId: string
}

export function AddAppointmentSection({ caseId }: AddAppointmentSectionProps) {
  const [showForm, setShowForm] = useState(false)

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="w-full px-md py-sm text-meta text-accent-primary border border-accent-primary/30 rounded-md hover:bg-accent-primary/5"
      >
        + Add appointment
      </button>
    )
  }

  return (
    <div className="p-md bg-white border border-divider rounded-md">
      <h3 className="text-body font-medium text-text-primary mb-sm">New Appointment</h3>
      <AppointmentForm
        caseId={caseId}
        onSuccess={() => setShowForm(false)}
        onCancel={() => setShowForm(false)}
      />
    </div>
  )
}
