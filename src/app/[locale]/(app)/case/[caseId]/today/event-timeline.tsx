'use client'

import { useMemo } from 'react'
import { EventCard } from './event-card'
import type { Event } from '@/lib/api/events'
import type { Scope } from '@prisma/client'

interface EventTimelineProps {
  events: EventWithScopes[]
  canEdit: boolean
  scopes: Scope[]
  caseId: string
  isClinician?: boolean
  currentUserId?: string
}

function formatDayHeader(date: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const eventDate = new Date(date)
  eventDate.setHours(0, 0, 0, 0)

  if (eventDate.getTime() === today.getTime()) {
    return 'Today'
  }
  if (eventDate.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  }

  // Format as "Mon 20 Jan"
  return eventDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function getDayKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function EventTimeline({
  events,
  canEdit,
  scopes,
  caseId,
  isClinician,
  currentUserId,
}: EventTimelineProps) {
  // Group events by day
  const groupedEvents = useMemo(() => {
    const groups: Map<string, { label: string; events: EventWithScopes[] }> = new Map()

    for (const event of events) {
      const dayKey = getDayKey(event.occurredAt)

      if (!groups.has(dayKey)) {
        groups.set(dayKey, {
          label: formatDayHeader(event.occurredAt),
          events: [],
        })
      }

      groups.get(dayKey)!.events.push(event)
    }

    return Array.from(groups.entries()).sort(
      (a, b) => b[0].localeCompare(a[0]) // Reverse chronological by day
    )
  }, [events])

  if (events.length === 0) {
    return (
      <div className="text-center py-xl">
        <p className="text-body text-text-secondary">No observations yet</p>
        {canEdit && (
          <p className="text-meta text-text-secondary mt-xs">
            Use the form above to log your first entry
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-md">
      {groupedEvents.map(([dayKey, group]) => (
        <section key={dayKey}>
          {/* Day header */}
          <h2 className="text-meta font-medium text-text-secondary mb-sm sticky top-0 bg-bg-primary py-xs">
            {group.label}
          </h2>

          {/* Events for this day */}
          <div className="space-y-sm">
            {group.events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                canEdit={canEdit}
                scopes={scopes}
                caseId={caseId}
                isClinician={isClinician}
                currentUserId={currentUserId}
                allEvents={events}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
