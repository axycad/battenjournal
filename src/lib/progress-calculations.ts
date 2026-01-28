import type { EventType, SeverityLevel } from './event-types'

export interface EventData {
  id: string
  eventType: string
  occurredAt: Date
  severity: number | null
}

export interface FrequencyData {
  count: number
  average7Day: number
  trend: 'increasing' | 'decreasing' | 'stable'
  percentChange: number
}

export interface SeverityData {
  currentAverage: number
  average7Day: number
  trend: 'increasing' | 'decreasing' | 'stable'
  percentChange: number
}

export interface ProgressData {
  frequency: FrequencyData
  severity?: SeverityData
}

/**
 * Get date range for calculations
 */
export function getDateRanges() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const last7Days = new Date(today)
  last7Days.setDate(last7Days.getDate() - 7)

  const previous7Days = new Date(last7Days)
  previous7Days.setDate(previous7Days.getDate() - 7)

  return {
    today,
    last7Days,
    previous7Days,
  }
}

/**
 * Filter events by type and date range
 */
export function filterEvents(
  events: EventData[],
  eventType: EventType,
  startDate: Date,
  endDate: Date
): EventData[] {
  return events.filter(
    (event) =>
      event.eventType === eventType &&
      event.occurredAt >= startDate &&
      event.occurredAt < endDate
  )
}

/**
 * Calculate frequency data for an event type
 */
export function calculateFrequency(
  events: EventData[],
  eventType: EventType
): FrequencyData {
  const { today, last7Days, previous7Days } = getDateRanges()

  // Count today's events
  const todayEvents = filterEvents(events, eventType, today, new Date())
  const todayCount = todayEvents.length

  // Count last 7 days (including today)
  const last7DaysEvents = filterEvents(events, eventType, last7Days, new Date())
  const last7DaysCount = last7DaysEvents.length
  const last7DaysAverage = last7DaysCount / 7

  // Count previous 7 days (for comparison)
  const previous7DaysEvents = filterEvents(events, eventType, previous7Days, last7Days)
  const previous7DaysCount = previous7DaysEvents.length
  const previous7DaysAverage = previous7DaysCount / 7

  // Calculate trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  let percentChange = 0

  if (previous7DaysAverage > 0) {
    percentChange = ((last7DaysAverage - previous7DaysAverage) / previous7DaysAverage) * 100

    if (percentChange > 10) {
      trend = 'increasing'
    } else if (percentChange < -10) {
      trend = 'decreasing'
    }
  } else if (last7DaysAverage > 0) {
    trend = 'increasing'
    percentChange = 100
  }

  return {
    count: todayCount,
    average7Day: last7DaysAverage,
    trend,
    percentChange,
  }
}

/**
 * Calculate severity trend for an event type
 */
export function calculateSeverity(
  events: EventData[],
  eventType: EventType
): SeverityData | undefined {
  const { last7Days, previous7Days } = getDateRanges()

  // Get last 7 days events with severity
  const last7DaysEvents = filterEvents(events, eventType, last7Days, new Date()).filter(
    (e) => e.severity !== null
  )

  if (last7DaysEvents.length === 0) {
    return undefined
  }

  // Calculate current average severity
  const currentSum = last7DaysEvents.reduce((sum, e) => sum + (e.severity || 0), 0)
  const currentAverage = currentSum / last7DaysEvents.length

  // Get previous 7 days events with severity
  const previous7DaysEvents = filterEvents(events, eventType, previous7Days, last7Days).filter(
    (e) => e.severity !== null
  )

  if (previous7DaysEvents.length === 0) {
    return {
      currentAverage,
      average7Day: currentAverage,
      trend: 'stable',
      percentChange: 0,
    }
  }

  // Calculate previous average severity
  const previousSum = previous7DaysEvents.reduce((sum, e) => sum + (e.severity || 0), 0)
  const previousAverage = previousSum / previous7DaysEvents.length

  // Calculate trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  const percentChange = ((currentAverage - previousAverage) / previousAverage) * 100

  // For severity, increasing is concerning (threshold: 15%)
  if (percentChange > 15) {
    trend = 'increasing'
  } else if (percentChange < -15) {
    trend = 'decreasing'
  }

  return {
    currentAverage,
    average7Day: currentAverage,
    trend,
    percentChange,
  }
}

/**
 * Calculate complete progress data for an event type
 */
export function calculateProgress(
  events: EventData[],
  eventType: EventType
): ProgressData {
  return {
    frequency: calculateFrequency(events, eventType),
    severity: calculateSeverity(events, eventType),
  }
}

/**
 * Get daily counts for sparkline visualization (last 7 days)
 */
export function getDailyCounts(
  events: EventData[],
  eventType: EventType
): number[] {
  const { last7Days } = getDateRanges()
  const counts: number[] = []

  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(last7Days)
    dayStart.setDate(dayStart.getDate() + i)

    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const dayEvents = filterEvents(events, eventType, dayStart, dayEnd)
    counts.push(dayEvents.length)
  }

  return counts
}

/**
 * Check if event type should show frequency alert
 */
export function shouldShowFrequencyAlert(
  frequencyData: FrequencyData,
  threshold: number = 3
): boolean {
  return (
    frequencyData.count >= threshold &&
    frequencyData.count > frequencyData.average7Day
  )
}

/**
 * Check if event type should show severity alert
 */
export function shouldShowSeverityAlert(severityData?: SeverityData): boolean {
  if (!severityData) return false
  return severityData.trend === 'increasing' && severityData.percentChange > 20
}
