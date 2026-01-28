import { getDailyCounts } from '@/lib/progress-calculations'
import type { EventType } from '@/lib/event-types'
import type { EventData } from '@/lib/progress-calculations'

interface MiniTrendChartProps {
  events: EventData[]
  eventType: EventType
  label?: string
}

/**
 * Convert counts to sparkline characters
 * Uses block elements: ▁ ▂ ▃ ▄ ▅ ▆ ▇ █
 */
function countsToSparkline(counts: number[]): string {
  if (counts.length === 0) return ''

  const max = Math.max(...counts, 1) // Avoid division by zero
  const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']

  return counts
    .map((count) => {
      const ratio = count / max
      const index = Math.min(Math.floor(ratio * blocks.length), blocks.length - 1)
      return blocks[index]
    })
    .join('')
}

export function MiniTrendChart({ events, eventType, label }: MiniTrendChartProps) {
  const dailyCounts = getDailyCounts(events, eventType)
  const sparkline = countsToSparkline(dailyCounts)
  const totalEvents = dailyCounts.reduce((sum, count) => sum + count, 0)
  const average = (totalEvents / 7).toFixed(1)
  const todayCount = dailyCounts[dailyCounts.length - 1] || 0

  return (
    <div className="p-sm bg-bg-primary border border-divider rounded-md">
      <div className="flex items-center justify-between gap-sm">
        <div className="flex-1">
          {label && (
            <p className="text-meta text-text-secondary mb-1">{label}</p>
          )}
          <div className="flex items-baseline gap-sm">
            <span className="text-title-md font-mono tracking-wider text-text-primary">
              {sparkline}
            </span>
            <span className="text-caption text-text-secondary">
              Last 7 days
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-body font-medium text-text-primary">
            {todayCount} today
          </p>
          <p className="text-caption text-text-secondary">
            Avg: {average}/day
          </p>
        </div>
      </div>
    </div>
  )
}
