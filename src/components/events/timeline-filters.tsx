'use client'

import { useState } from 'react'
import { EVENT_TYPES, type EventType, SEVERITY_LEVELS, type SeverityLevel } from '@/lib/event-types'
import type { Scope } from '@prisma/client'

export interface TimelineFilters {
  eventTypes: EventType[]
  severityLevels: SeverityLevel[]
  scopeCodes: string[]
  dateFrom?: Date
  dateTo?: Date
  searchText?: string
}

interface TimelineFiltersProps {
  scopes: Scope[]
  filters: TimelineFilters
  onChange: (filters: TimelineFilters) => void
  isClinician?: boolean
}

export function TimelineFiltersComponent({
  scopes,
  filters,
  onChange,
  isClinician,
}: TimelineFiltersProps) {
  const [expanded, setExpanded] = useState(false)

  const toggleEventType = (type: EventType) => {
    const newTypes = filters.eventTypes.includes(type)
      ? filters.eventTypes.filter((t) => t !== type)
      : [...filters.eventTypes, type]
    onChange({ ...filters, eventTypes: newTypes })
  }

  const toggleSeverity = (level: SeverityLevel) => {
    const newLevels = filters.severityLevels.includes(level)
      ? filters.severityLevels.filter((l) => l !== level)
      : [...filters.severityLevels, level]
    onChange({ ...filters, severityLevels: newLevels })
  }

  const toggleScope = (code: string) => {
    const newScopes = filters.scopeCodes.includes(code)
      ? filters.scopeCodes.filter((c) => c !== code)
      : [...filters.scopeCodes, code]
    onChange({ ...filters, scopeCodes: newScopes })
  }

  const clearFilters = () => {
    onChange({
      eventTypes: [],
      severityLevels: [],
      scopeCodes: [],
      dateFrom: undefined,
      dateTo: undefined,
      searchText: undefined,
    })
  }

  const activeFilterCount =
    filters.eventTypes.length +
    filters.severityLevels.length +
    filters.scopeCodes.length +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.searchText ? 1 : 0)

  const commonEventTypes: EventType[] = [
    'seizure',
    'medication',
    'feeding',
    'sleep',
    'comfort',
    'skin_wound',
    'infection',
  ]

  return (
    <div className="p-md bg-white border border-divider rounded-md">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-sm text-body font-medium text-text-primary"
        >
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-xs py-0.5 text-caption bg-accent-primary text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
          <span className="text-meta">{expanded ? '▼' : '▶'}</span>
        </button>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-meta text-text-secondary hover:text-accent-primary"
          >
            Clear all
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-md space-y-md">
          {/* Search */}
          <div>
            <label className="block text-meta text-text-secondary mb-xs">
              Search notes
            </label>
            <input
              type="text"
              value={filters.searchText || ''}
              onChange={(e) => onChange({ ...filters, searchText: e.target.value || undefined })}
              placeholder="Search in notes..."
              className="w-full px-sm py-2 text-body border border-divider rounded-md focus:outline-none focus:ring-2 focus:ring-accent-focus"
            />
          </div>

          {/* Event Types */}
          <div>
            <label className="block text-meta text-text-secondary mb-xs">
              Event types
            </label>
            <div className="flex flex-wrap gap-xs">
              {commonEventTypes.map((type) => {
                const config = EVENT_TYPES[type]
                const isActive = filters.eventTypes.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleEventType(type)}
                    className={`px-sm py-1 text-meta rounded-full border transition-colors ${
                      isActive
                        ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                        : 'border-divider text-text-secondary hover:border-accent-primary'
                    }`}
                  >
                    {config.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-meta text-text-secondary mb-xs">
              Severity
            </label>
            <div className="flex flex-wrap gap-xs">
              {Object.entries(SEVERITY_LEVELS).map(([key, value]) => {
                const isActive = filters.severityLevels.includes(value)
                const colorClass =
                  value === 4
                    ? 'border-semantic-critical text-semantic-critical'
                    : value === 3
                    ? 'border-semantic-warning text-semantic-warning'
                    : value === 2
                    ? 'border-amber-500 text-amber-600'
                    : 'border-divider text-text-secondary'

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSeverity(value)}
                    className={`px-sm py-1 text-meta rounded-full border transition-colors ${
                      isActive
                        ? `${colorClass} bg-current/10`
                        : 'border-divider text-text-secondary hover:border-accent-primary'
                    }`}
                  >
                    Level {value} ({key.toLowerCase()})
                  </button>
                )
              })}
            </div>
          </div>

          {/* Scopes (clinicians only) */}
          {isClinician && scopes.length > 0 && (
            <div>
              <label className="block text-meta text-text-secondary mb-xs">
                Scopes
              </label>
              <div className="flex flex-wrap gap-xs">
                {scopes.map((scope) => {
                  const isActive = filters.scopeCodes.includes(scope.code)
                  return (
                    <button
                      key={scope.code}
                      type="button"
                      onClick={() => toggleScope(scope.code)}
                      className={`px-sm py-1 text-meta rounded-full border transition-colors ${
                        isActive
                          ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                          : 'border-divider text-text-secondary hover:border-accent-primary'
                      }`}
                    >
                      {scope.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Date Range */}
          <div className="grid gap-sm sm:grid-cols-2">
            <div>
              <label className="block text-meta text-text-secondary mb-xs">
                From date
              </label>
              <input
                type="date"
                value={filters.dateFrom?.toISOString().split('T')[0] || ''}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    dateFrom: e.target.value ? new Date(e.target.value) : undefined,
                  })
                }
                className="w-full px-sm py-2 text-body border border-divider rounded-md focus:outline-none focus:ring-2 focus:ring-accent-focus"
              />
            </div>
            <div>
              <label className="block text-meta text-text-secondary mb-xs">
                To date
              </label>
              <input
                type="date"
                value={filters.dateTo?.toISOString().split('T')[0] || ''}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    dateTo: e.target.value ? new Date(e.target.value) : undefined,
                  })
                }
                className="w-full px-sm py-2 text-body border border-divider rounded-md focus:outline-none focus:ring-2 focus:ring-accent-focus"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
