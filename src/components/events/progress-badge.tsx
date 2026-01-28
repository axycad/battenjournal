import type { FrequencyData, SeverityData } from '@/lib/progress-calculations'
import { SEVERITY_LABELS } from '@/lib/event-types'

interface ProgressBadgeProps {
  frequencyData?: FrequencyData
  severityData?: SeverityData
  showFrequency?: boolean
  showSeverity?: boolean
}

export function ProgressBadge({
  frequencyData,
  severityData,
  showFrequency = true,
  showSeverity = true,
}: ProgressBadgeProps) {
  const badges: JSX.Element[] = []

  // Frequency badge (if count today > average)
  if (showFrequency && frequencyData && frequencyData.count > frequencyData.average7Day) {
    const avgFormatted = frequencyData.average7Day.toFixed(1)
    badges.push(
      <span
        key="frequency"
        className="inline-flex items-center gap-1 px-xs py-0.5 text-caption font-medium rounded bg-semantic-warning/10 text-semantic-warning border border-semantic-warning/30"
      >
        {frequencyData.count} today ↑ avg {avgFormatted}
      </span>
    )
  }

  // Severity badge (if increasing)
  if (showSeverity && severityData && severityData.trend === 'increasing') {
    const avgFormatted = severityData.average7Day.toFixed(1)
    badges.push(
      <span
        key="severity"
        className="inline-flex items-center gap-1 px-xs py-0.5 text-caption font-medium rounded bg-semantic-critical/10 text-semantic-critical border border-semantic-critical/30"
      >
        Severity ↑ avg {avgFormatted}
      </span>
    )
  }

  if (badges.length === 0) {
    return null
  }

  return <div className="flex flex-wrap gap-xs">{badges}</div>
}
