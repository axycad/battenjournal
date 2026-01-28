import { EVENT_TYPES, type EventType } from '@/lib/event-types'
import { calculateFrequency, type EventData } from '@/lib/progress-calculations'

interface ProgressSummaryProps {
  events: EventData[]
  eventTypes?: EventType[]
}

export function ProgressSummary({ events, eventTypes }: ProgressSummaryProps) {
  // Filter to relevant event types (exclude check-ins and "nothing new")
  const relevantTypes = eventTypes || [
    'seizure',
    'medication',
    'feeding',
    'sleep',
    'comfort',
    'skin_wound',
    'infection',
    'mobility',
  ]

  // Calculate progress for each type
  const progressItems = relevantTypes
    .map((eventType) => {
      const frequency = calculateFrequency(events, eventType)

      // Only show types with events in last 7 days
      if (frequency.average7Day === 0) return null

      return {
        eventType,
        label: EVENT_TYPES[eventType].label,
        frequency,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  if (progressItems.length === 0) {
    return null
  }

  return (
    <div className="p-md bg-white border border-divider rounded-md">
      <h3 className="text-body font-medium text-text-primary mb-sm">
        Last 7 Days Progress
      </h3>
      <div className="space-y-xs">
        {progressItems.map(({ eventType, label, frequency }) => {
          let trendIcon = '→'
          let trendColor = 'text-accent-primary'

          if (frequency.trend === 'decreasing') {
            trendIcon = '↓'
            trendColor = 'text-semantic-success'
          } else if (frequency.trend === 'increasing') {
            trendIcon = '↑'
            trendColor = 'text-semantic-warning'
          }

          const changeText =
            frequency.trend === 'stable'
              ? 'Stable'
              : frequency.trend === 'decreasing'
              ? `${Math.abs(frequency.percentChange).toFixed(0)}% decrease`
              : `${frequency.percentChange.toFixed(0)}% increase`

          return (
            <div
              key={eventType}
              className="flex items-center justify-between py-xs border-b border-divider last:border-0"
            >
              <span className="text-body text-text-primary">{label}</span>
              <div className="flex items-center gap-sm">
                <span className={`text-body font-medium ${trendColor}`}>
                  {trendIcon} {changeText}
                </span>
                <span className="text-meta text-text-secondary">
                  {frequency.average7Day.toFixed(1)}/day
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
