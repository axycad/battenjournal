'use client'

import { useState, useMemo } from 'react'
import { EventTimeline } from './event-timeline'
import { TimelineFiltersComponent, type TimelineFilters } from '@/components/events/timeline-filters'
import { TimelineExport } from '@/components/events/timeline-export'
import type { Event } from '@/lib/api/events'
import type { Scope } from '@prisma/client'
import type { EventType, SeverityLevel } from '@/lib/event-types'

interface TimelineWithFiltersProps {
  events: EventWithScopes[]
  canEdit: boolean
  scopes: Scope[]
  caseId: string
  childName: string
  isClinician?: boolean
  currentUserId?: string
}

export function TimelineWithFilters({
  events,
  canEdit,
  scopes,
  caseId,
  childName,
  isClinician,
  currentUserId,
}: TimelineWithFiltersProps) {
  const [filters, setFilters] = useState<TimelineFilters>({
    eventTypes: [],
    severityLevels: [],
    scopeCodes: [],
  })

  // Apply filters to events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Filter by event type
      if (filters.eventTypes.length > 0) {
        if (!filters.eventTypes.includes(event.eventType as EventType)) {
          return false
        }
      }

      // Filter by severity
      if (filters.severityLevels.length > 0) {
        if (!event.severity || !filters.severityLevels.includes(event.severity as SeverityLevel)) {
          return false
        }
      }

      // Filter by scopes
      if (filters.scopeCodes.length > 0) {
        const eventScopeCodes = event.scopes.map((s) => s.code)
        if (!filters.scopeCodes.some((code) => eventScopeCodes.includes(code))) {
          return false
        }
      }

      // Filter by date range
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        if (event.occurredAt < fromDate) {
          return false
        }
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (event.occurredAt > toDate) {
          return false
        }
      }

      // Filter by search text
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase()
        const freeTextMatch = event.freeText?.toLowerCase().includes(searchLower)
        const scopeMatch = event.scopes.some((s) =>
          s.label.toLowerCase().includes(searchLower)
        )
        if (!freeTextMatch && !scopeMatch) {
          return false
        }
      }

      return true
    })
  }, [events, filters])

  const hasActiveFilters =
    filters.eventTypes.length > 0 ||
    filters.severityLevels.length > 0 ||
    filters.scopeCodes.length > 0 ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.searchText

  return (
    <div className="space-y-md">
      {/* Filters and Export */}
      <div className="flex flex-col sm:flex-row gap-sm items-start sm:items-center justify-between">
        <div className="flex-1 w-full">
          <TimelineFiltersComponent
            scopes={scopes}
            filters={filters}
            onChange={setFilters}
            isClinician={isClinician}
          />
        </div>
        <div className="flex gap-sm">
          <TimelineExport
            events={filteredEvents}
            caseId={caseId}
            childName={childName}
          />
        </div>
      </div>

      {/* Results count */}
      {hasActiveFilters && (
        <p className="text-meta text-text-secondary">
          Showing {filteredEvents.length} of {events.length} events
        </p>
      )}

      {/* Timeline */}
      <EventTimeline
        events={filteredEvents}
        canEdit={canEdit}
        scopes={scopes}
        caseId={caseId}
        isClinician={isClinician}
        currentUserId={currentUserId}
      />
    </div>
  )
}
