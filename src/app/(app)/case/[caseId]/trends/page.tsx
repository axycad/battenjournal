import Link from 'next-intl/link'
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

function getCheckInStatus(freeText?: string | null) {
  if (!freeText) return null
  const tokenMatch = freeText.match(/\[checkin:(better|same|worse|unsure)\]/)
  if (tokenMatch) {
    return tokenMatch[1]
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
  const checkInSummary = checkIns.reduce(
    (acc, event) => {
      const status = getCheckInStatus(event.freeText)
      if (status && acc[status] !== undefined) {
        acc[status] += 1
      }
      return acc
    },
    { better: 0, same: 0, worse: 0, unsure: 0 }
  )

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}`}
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          â† {t('backToChild', { name: caseData.childDisplayName })}
        </Link>
        <h1 className="screen-title mt-xs">{t('title')}</h1>
        <div className="mt-sm flex flex-wrap gap-sm">
          <Link
            href={`/case/${caseId}/today`}
            className="text-meta text-text-secondary hover:text-accent-primary"
          >
            {t('today')}
          </Link>
          <span className="text-meta text-text-secondary">Â·</span>
          <Link
            href={`/case/${caseId}`}
            className="text-meta text-text-secondary hover:text-accent-primary"
          >
            {t('overview')}
          </Link>
        </div>
      </div>

      <div className="mb-lg flex flex-wrap gap-sm">
        {[7, 30, 90].map((days) => (
          <Link
            key={days}
            href={`/case/${caseId}/trends?range=${days}`}
            className={`px-sm py-1 text-meta rounded-full border transition-colors ${
              rangeDays === days
                ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                : 'border-divider text-text-secondary hover:border-accent-primary'
            }`}
          >
            {t('days', { count: days })}
          </Link>
        ))}
      </div>

      <div className="space-y-md">
        <div className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header">{t('dailyCheckIns')}</h2>
          <p className="text-meta text-text-secondary">
            {t('checkInsCount', { count: checkIns.length, days: rangeDays })}
          </p>
          <div className="mt-sm grid gap-sm sm:grid-cols-4">
            <div className="p-sm rounded-sm bg-bg-primary">
              <p className="text-caption text-text-secondary">{t('better')}</p>
              <p className="text-title-md font-medium">{checkInSummary.better}</p>
            </div>
            <div className="p-sm rounded-sm bg-bg-primary">
              <p className="text-caption text-text-secondary">{t('steadier')}</p>
              <p className="text-title-md font-medium">{checkInSummary.same}</p>
            </div>
            <div className="p-sm rounded-sm bg-bg-primary">
              <p className="text-caption text-text-secondary">{t('tougherDays')}</p>
              <p className="text-title-md font-medium">{checkInSummary.worse}</p>
            </div>
            <div className="p-sm rounded-sm bg-bg-primary">
              <p className="text-caption text-text-secondary">{t('notSure')}</p>
              <p className="text-title-md font-medium">{checkInSummary.unsure}</p>
            </div>
          </div>
        </div>

        {trendCards.length === 0 ? (
          <div className="text-center py-xl">
            <p className="text-body text-text-secondary">
              {t('noObservations')}
            </p>
          </div>
        ) : (
          trendCards.map((card) => {
            const change = card.rangeCount - card.prevCount
            const changeLabel =
              change === 0
                ? t('stable')
                : change > 0
                ? t('increase', { count: change })
                : t('decrease', { count: change })

            return (
              <div key={card.type} className="p-md bg-white border border-divider rounded-md">
                <div className="flex flex-wrap items-center justify-between gap-sm">
                  <div>
                    <h3 className="text-title-md font-medium">{card.label}</h3>
                    <p className="text-meta text-text-secondary">
                      {t('eventsCount', { count: card.rangeCount, days: rangeDays })}
                    </p>
                  </div>
                  <span className="text-caption text-text-secondary">{changeLabel}</span>
                </div>

                <div className="mt-sm">
                  <div className="flex items-end gap-xs h-20">
                    {card.counts.map((count, index) => (
                      <div key={`${card.type}-${rangeDayKeys[index]}`} className="flex flex-col items-center">
                        <div
                          className="w-2 rounded-full bg-accent-primary/60"
                          style={{ height: `${Math.max(6, (count / card.maxCount) * 64)}px` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-xs flex justify-between text-caption text-text-secondary">
                    <span>{formatDayLabel(rangeDaysList[0])}</span>
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
