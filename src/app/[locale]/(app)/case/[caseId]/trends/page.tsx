import {Link} from '@/navigation'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getCase } from '@/actions/case'
import { getEventsForCase } from '@/actions/event'
import { EVENT_TYPES } from '@/lib/event-types'

interface TrendsPageProps {
  params: Promise<{ caseId: string }>
  searchParams?: Promise<{ range?: string }>
}

function getRangeDays(rangeParam?: string) {
  const parsed = Number(rangeParam)
  if ([7, 30, 90].includes(parsed)) return parsed
  return 30
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

function getDayKey(date: Date) {
  return date.toISOString().split('T')[0]
}

type CheckInStatus = 'better' | 'same' | 'worse' | 'unsure'

function getCheckInStatus(freeText?: string | null): CheckInStatus | null {
  if (!freeText) return null
  const tokenMatch = freeText.match(/\[checkin:(better|same|worse|unsure)\]/)
  if (tokenMatch) {
    return tokenMatch[1] as CheckInStatus
  }
  const lower = freeText.toLowerCase()
  if (lower.includes('better than usual')) return 'better'
  if (lower.includes('about the same')) return 'same'
  if (lower.includes('hard to say today')) return 'unsure'
  if (lower.includes('more challenging than usual')) return 'worse'
  if (lower.includes('worse than usual')) return 'worse'
  return null
}

export default async function TrendsPage({ params, searchParams }: TrendsPageProps) {
  const { caseId } = await params
  const { range } = (await searchParams) || {}
  const rangeDays = getRangeDays(range)
  const t = await getTranslations('trends')

  const [caseData, events] = await Promise.all([
    getCase(caseId),
    getEventsForCase(caseId, { limit: 500 }),
  ])

  if (!caseData) {
    notFound()
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (rangeDays - 1))

  const prevStartDate = new Date(startDate)
  prevStartDate.setDate(prevStartDate.getDate() - rangeDays)

  const rangeDayKeys: string[] = []
  const rangeDaysList: Date[] = []
  for (let i = 0; i < rangeDays; i += 1) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    rangeDaysList.push(date)
    rangeDayKeys.push(getDayKey(date))
  }

  const eventsInWindow = events.filter((event) => event.occurredAt >= prevStartDate)
  const eventsInRange = events.filter((event) => event.occurredAt >= startDate)

  const eventTypes = Array.from(
    new Set(eventsInRange.map((event) => event.eventType))
  ).filter((type) => !['daily_checkin', 'nothing_new'].includes(type))

  const trendCards = eventTypes.map((type) => {
    const countsByDay = new Map<string, number>()
    for (const dayKey of rangeDayKeys) {
      countsByDay.set(dayKey, 0)
    }

    const rangeCount = eventsInRange.filter((event) => event.eventType === type).length
    const prevCount = eventsInWindow.filter(
      (event) =>
        event.eventType === type &&
        event.occurredAt >= prevStartDate &&
        event.occurredAt < startDate
    ).length

    eventsInRange
      .filter((event) => event.eventType === type)
      .forEach((event) => {
        const dayKey = getDayKey(event.occurredAt)
        if (countsByDay.has(dayKey)) {
          countsByDay.set(dayKey, (countsByDay.get(dayKey) || 0) + 1)
        }
      })

    const counts = rangeDayKeys.map((key) => countsByDay.get(key) || 0)
    const maxCount = Math.max(...counts, 1)

    return {
      type,
      label: EVENT_TYPES[type as keyof typeof EVENT_TYPES]?.label || type,
      counts,
      maxCount,
      rangeCount,
      prevCount,
    }
  })

  const checkIns = eventsInRange.filter((event) => event.eventType === 'daily_checkin')
  const checkInSummary = checkIns.reduce<Record<CheckInStatus, number>>(
    (acc, event) => {
      const status = getCheckInStatus(event.freeText)
      if (status) acc[status] += 1
      return acc
    },
    { better: 0, same: 0, worse: 0, unsure: 0 }
  )

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}`}
          className="text-meta text-purple-600 hover:text-purple-700 hover:underline"
        >
          â† {t('backToChild', { name: caseData.childDisplayName })}
        </Link>
        <h1 className="text-h2 font-bold text-text-primary mt-xs">{t('title')}</h1>
        <div className="mt-sm flex flex-wrap gap-sm">
          <Link
            href={`/case/${caseId}/today`}
            className="text-meta text-purple-600 hover:text-purple-700 hover:underline"
          >
            {t('today')}
          </Link>
          <span className="text-meta text-text-secondary">Â·</span>
          <Link
            href={`/case/${caseId}`}
            className="text-meta text-purple-600 hover:text-purple-700 hover:underline"
          >
            {t('overview')}
          </Link>
        </div>
      </div>

      {/* Time range selector */}
      <div className="mb-lg">
        <p className="text-meta text-text-secondary mb-sm">Time range</p>
        <div className="flex flex-wrap gap-sm">
          {[7, 30, 90].map((days) => (
            <Link
              key={days}
              href={`/case/${caseId}/trends?range=${days}`}
              className={`px-md py-sm text-body rounded-lg border-2 transition-all font-medium ${
                rangeDays === days
                  ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm'
                  : 'border-purple-200 text-text-secondary hover:border-purple-400 hover:bg-purple-50'
              }`}
            >
              {days} days
            </Link>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      {eventsInRange.length > 0 && (
        <div className="mb-lg p-md bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between flex-wrap gap-md">
            <div>
              <p className="text-caption text-purple-700 font-medium uppercase tracking-wide">Summary</p>
              <p className="text-h3 font-bold text-purple-900">{eventsInRange.length} observations</p>
              <p className="text-meta text-purple-700">logged in the last {rangeDays} days</p>
            </div>
            <div className="flex gap-md">
              <div className="text-right">
                <p className="text-caption text-purple-700">Daily average</p>
                <p className="text-title-lg font-semibold text-purple-900">{(eventsInRange.length / rangeDays).toFixed(1)}</p>
              </div>
              <div className="text-right">
                <p className="text-caption text-purple-700">Event types</p>
                <p className="text-title-lg font-semibold text-purple-900">{trendCards.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-md">
        <div className="p-md bg-white border border-purple-100 rounded-lg shadow-sm">
          <h2 className="section-header">{t('dailyCheckIns')}</h2>
          <p className="text-meta text-text-secondary">
            {t('checkInsCount', { count: checkIns.length, days: rangeDays })}
          </p>
          <div className="mt-sm grid gap-sm sm:grid-cols-4">
            <div className="p-sm rounded-md bg-green-50 border border-green-200">
              <p className="text-caption text-green-700 font-medium">{t('better')}</p>
              <p className="text-title-lg font-semibold text-green-800">{checkInSummary.better}</p>
            </div>
            <div className="p-sm rounded-md bg-blue-50 border border-blue-200">
              <p className="text-caption text-blue-700 font-medium">{t('steadier')}</p>
              <p className="text-title-lg font-semibold text-blue-800">{checkInSummary.same}</p>
            </div>
            <div className="p-sm rounded-md bg-orange-50 border border-orange-200">
              <p className="text-caption text-orange-700 font-medium">{t('tougherDays')}</p>
              <p className="text-title-lg font-semibold text-orange-800">{checkInSummary.worse}</p>
            </div>
            <div className="p-sm rounded-md bg-gray-50 border border-gray-200">
              <p className="text-caption text-gray-700 font-medium">{t('notSure')}</p>
              <p className="text-title-lg font-semibold text-gray-800">{checkInSummary.unsure}</p>
            </div>
          </div>
        </div>

        {trendCards.length === 0 ? (
          <div className="p-xl bg-white border border-purple-100 rounded-lg shadow-sm text-center">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-md">
              <span className="text-3xl">📊</span>
            </div>
            <h3 className="text-title-lg font-semibold text-text-primary mb-xs">
              No observations yet
            </h3>
            <p className="text-body text-text-secondary mb-md">
              {t('noObservations')}
            </p>
            <Link href={`/case/${caseId}/today`}>
              <button className="px-lg py-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md hover:shadow-lg transition-all font-medium">
                Log your first observation
              </button>
            </Link>
          </div>
        ) : (
          trendCards.map((card) => {
            const change = card.rangeCount - card.prevCount
            const changePercent = card.prevCount > 0 ? Math.round((change / card.prevCount) * 100) : 0
            const isIncrease = change > 0
            const isDecrease = change < 0
            const isStable = change === 0

            return (
              <div key={card.type} className="p-md bg-white border border-purple-100 rounded-lg shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-sm mb-sm">
                  <div>
                    <h3 className="text-title-lg font-semibold text-text-primary">{card.label}</h3>
                    <p className="text-meta text-text-secondary">
                      <span className="font-medium text-text-primary">{card.rangeCount}</span> {card.rangeCount === 1 ? 'event' : 'events'} in last {rangeDays} days
                    </p>
                  </div>
                  {!isStable && (
                    <span className={`px-sm py-xs rounded-full text-caption font-medium ${
                      isIncrease
                        ? 'bg-orange-50 text-orange-700 border border-orange-200'
                        : 'bg-green-50 text-green-700 border border-green-200'
                    }`}>
                      {isIncrease ? '↑' : '↓'} {Math.abs(changePercent)}% vs previous period
                    </span>
                  )}
                  {isStable && (
                    <span className="px-sm py-xs rounded-full text-caption font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      → Stable
                    </span>
                  )}
                </div>

                {/* Chart container with overflow scroll for 90 days */}
                <div className="mt-md">
                  <div className="overflow-x-auto pb-xs">
                    <div className="flex items-end gap-xs h-20 min-w-full" style={{ width: `${rangeDays * 3}px` }}>
                      {card.counts.map((count, index) => (
                        <div
                          key={`${card.type}-${rangeDayKeys[index]}`}
                          className="flex flex-col items-center flex-shrink-0"
                          style={{ width: '2px' }}
                        >
                          <div
                            className="w-full rounded-full bg-gradient-to-t from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-colors cursor-pointer"
                            style={{ height: `${Math.max(4, (count / card.maxCount) * 64)}px` }}
                            title={`${formatDayLabel(rangeDaysList[index])}: ${count} ${count === 1 ? 'event' : 'events'}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-xs flex justify-between text-caption text-text-secondary">
                    <span>{formatDayLabel(rangeDaysList[0])}</span>
                    <span className="text-center">{rangeDays} days</span>
                    <span>{formatDayLabel(rangeDaysList[rangeDaysList.length - 1])}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
