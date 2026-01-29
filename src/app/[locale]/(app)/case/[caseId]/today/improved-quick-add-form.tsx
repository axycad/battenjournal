'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button, Input, Textarea, SeveritySlider } from '@/components/ui'
import { createEvent, type EventWithScopes } from '@/lib/api/events'
import { EVENT_TYPES, type EventType, type SeverityLevel } from '@/lib/event-types'
import { useOffline } from '@/lib/offline/context'
import { createEventOffline } from '@/lib/offline/sync'
import { MiniTrendChart } from '@/components/events/mini-trend-chart'
import type { Scope } from '@prisma/client'

interface ImprovedQuickAddFormProps {
  caseId: string
  scopes: Scope[]
  events?: EventWithScopes[]
}

// Event type groups with visual indicators
const EVENT_TYPE_GROUPS = {
  critical: [
    { type: 'seizure' as EventType, icon: '⚡', color: 'bg-red-50 border-red-200 text-red-700' },
    { type: 'infection' as EventType, icon: '🦠', color: 'bg-red-50 border-red-200 text-red-700' },
    { type: 'skin_wound' as EventType, icon: '🩹', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  ],
  common: [
    { type: 'medication' as EventType, icon: '💊', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { type: 'feeding' as EventType, icon: '🍽️', color: 'bg-green-50 border-green-200 text-green-700' },
    { type: 'sleep' as EventType, icon: '😴', color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { type: 'comfort' as EventType, icon: '🤗', color: 'bg-pink-50 border-pink-200 text-pink-700' },
  ],
  other: [
    { type: 'mobility' as EventType, icon: '🏃', color: 'bg-gray-50 border-gray-200 text-gray-700' },
    { type: 'vision_comm' as EventType, icon: '👁️', color: 'bg-gray-50 border-gray-200 text-gray-700' },
    { type: 'care_admin' as EventType, icon: '📋', color: 'bg-gray-50 border-gray-200 text-gray-700' },
    { type: 'general' as EventType, icon: '📝', color: 'bg-gray-50 border-gray-200 text-gray-700' },
  ],
}

// Common phrases per event type for quick logging
const QUICK_PHRASES: Record<string, string[]> = {
  seizure: [
    'Brief myoclonic jerks',
    'Tonic-clonic seizure',
    'Settled after 5 minutes',
    'Rescue medication given',
  ],
  feeding: [
    'Full feed completed',
    'Took half portion',
    'Refused feed',
    'Enjoyed meal',
  ],
  sleep: [
    'Slept through the night',
    'Woke several times',
    'Restless night',
    'Good nap',
  ],
  comfort: [
    'Happy and comfortable',
    'Seemed uncomfortable',
    'Position change helped',
    'Responded well to music',
  ],
}

export function ImprovedQuickAddForm({ caseId, scopes, events = [] }: ImprovedQuickAddFormProps) {
  const t = useTranslations('quickAdd')
  const router = useRouter()
  const { data: session } = useSession()
  const { isOnline } = useOffline()

  const [selectedType, setSelectedType] = useState<EventType | null>(null)
  const [freeText, setFreeText] = useState('')
  const [severity, setSeverity] = useState<SeverityLevel | undefined>(undefined)
  const [duration, setDuration] = useState('')
  const [backdateTime, setBackdateTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [detailMode, setDetailMode] = useState(false)
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])

  // Quick context toggles
  const [afterSleep, setAfterSleep] = useState(false)
  const [afterMeds, setAfterMeds] = useState(false)
  const [whileIll, setWhileIll] = useState(false)

  function getDefaultSeverity(eventType: EventType): SeverityLevel | undefined {
    try {
      const stored = localStorage.getItem(`severity-default-${eventType}`)
      return stored ? (parseInt(stored) as SeverityLevel) : undefined
    } catch {
      return undefined
    }
  }

  function saveDefaultSeverity(eventType: EventType, severity: SeverityLevel) {
    try {
      localStorage.setItem(`severity-default-${eventType}`, severity.toString())
    } catch {}
  }

  function handleTypeSelect(type: EventType) {
    setSelectedType(type)
    setSelectedScopes([...EVENT_TYPES[type].defaultScopes])
    setFormError('')

    const defaultSeverity = getDefaultSeverity(type)
    if (defaultSeverity) {
      setSeverity(defaultSeverity)
    } else {
      // Set reasonable defaults for each type
      setSeverity(type === 'seizure' || type === 'infection' ? 2 : 1)
    }
  }

  function handleQuickPhrase(phrase: string) {
    setFreeText((prev) => (prev ? `${prev}. ${phrase}` : phrase))
  }

  async function handleSubmit() {
    if (!selectedType) return

    // Build scope set
    const scopeSet = new Set<string>(selectedScopes)
    if (afterSleep) scopeSet.add('sleep')
    if (afterMeds) scopeSet.add('meds')
    if (whileIll) scopeSet.add('infection')

    setSaving(true)
    setFormError('')

    try {
      let notesWithContext = freeText
      if (duration) {
        notesWithContext = `Duration: ${duration} min. ${notesWithContext}`
      }

      const result = await createEventAPI(caseId, {
        eventType: selectedType,
        freeText: notesWithContext.trim() || undefined,
        occurredAt: backdateTime || undefined,
        scopeCodes: Array.from(scopeSet),
        severity,
      })

      if (!result.success) {
        setFormError(result.error || 'Failed to save')
        setSaving(false)
        return
      }

      // Save severity default
      if (severity) {
        saveDefaultSeverity(selectedType, severity)
      }

      // Reset form
      setSelectedType(null)
      setFreeText('')
      setSeverity(undefined)
      setDuration('')
      setBackdateTime('')
      setAfterSleep(false)
      setAfterMeds(false)
      setWhileIll(false)
      setDetailMode(false)
      router.refresh()
    } catch (e) {
      console.error('Submit error:', e)
      setFormError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setSelectedType(null)
    setFreeText('')
    setSeverity(undefined)
    setDuration('')
    setBackdateTime('')
    setAfterSleep(false)
    setAfterMeds(false)
    setWhileIll(false)
    setDetailMode(false)
    setFormError('')
  }

  const allEventTypes = [
    ...EVENT_TYPE_GROUPS.critical,
    ...EVENT_TYPE_GROUPS.common,
    ...EVENT_TYPE_GROUPS.other,
  ]

  const typeConfig = selectedType ? EVENT_TYPES[selectedType] : null
  const quickPhrases = selectedType ? QUICK_PHRASES[selectedType] || [] : []

  return (
    <div className="p-md bg-white border border-purple-100 rounded-lg shadow-sm">
      <div className="space-y-md">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h3 font-semibold text-text-primary">Log observation</h2>
            <p className="text-meta text-text-secondary">
              Quick capture • Every detail helps
            </p>
          </div>
          {selectedType && (
            <button
              type="button"
              onClick={() => setDetailMode(!detailMode)}
              className="text-meta text-purple-600 hover:text-purple-700 hover:underline font-medium"
            >
              {detailMode ? '← Quick mode' : 'Detailed mode →'}
            </button>
          )}
        </div>

        {/* Event type selector - Visual grid */}
        <div className="space-y-sm">
          <p className="text-body font-medium text-text-primary">What happened?</p>

          {/* Critical events */}
          <div>
            <p className="text-caption text-text-secondary mb-xs">Critical concerns</p>
            <div className="grid grid-cols-3 gap-xs">
              {EVENT_TYPE_GROUPS.critical.map(({ type, icon, color }) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  disabled={saving}
                  className={`p-sm border-2 rounded-md transition-all ${
                    selectedType === type
                      ? `${color} font-medium border-current`
                      : 'bg-white border-divider hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-xs">{icon}</div>
                  <div className="text-meta">{EVENT_TYPES[type].label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Common events */}
          <div>
            <p className="text-caption text-text-secondary mb-xs">Daily care</p>
            <div className="grid grid-cols-4 gap-xs">
              {EVENT_TYPE_GROUPS.common.map(({ type, icon, color }) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  disabled={saving}
                  className={`p-sm border-2 rounded-md transition-all ${
                    selectedType === type
                      ? `${color} font-medium border-current`
                      : 'bg-white border-divider hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-xs">{icon}</div>
                  <div className="text-meta">{EVENT_TYPES[type].label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Other events - collapsible */}
          <details>
            <summary className="cursor-pointer text-meta text-accent-primary hover:underline">
              More event types
            </summary>
            <div className="grid grid-cols-4 gap-xs mt-sm">
              {EVENT_TYPE_GROUPS.other.map(({ type, icon, color }) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  disabled={saving}
                  className={`p-sm border-2 rounded-md transition-all ${
                    selectedType === type
                      ? `${color} font-medium border-current`
                      : 'bg-white border-divider hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-xs">{icon}</div>
                  <div className="text-meta">{EVENT_TYPES[type].label}</div>
                </button>
              ))}
            </div>
          </details>
        </div>

        {/* Form - shows after event type selected */}
        {selectedType && (
          <div className="space-y-md p-sm bg-bg-primary rounded-md">
            {/* Mini trend chart */}
            {events.filter((e) => e.eventType === selectedType).length > 0 && (
              <MiniTrendChart
                events={events.map((e) => ({
                  id: e.id,
                  eventType: e.eventType,
                  occurredAt: e.occurredAt,
                  severity: e.severity,
                }))}
                eventType={selectedType}
                label={`Recent ${EVENT_TYPES[selectedType].label}`}
              />
            )}

            {/* Severity - ALWAYS VISIBLE (required for research) */}
            <div>
              <SeveritySlider
                value={severity}
                onChange={(val) => {
                  setSeverity(val)
                  saveDefaultSeverity(selectedType, val)
                }}
                label="How significant was this?"
                required
              />
              <p className="text-caption text-text-secondary mt-xs">
                Helps track patterns over time
              </p>
            </div>

            {/* Duration for relevant event types */}
            {(selectedType === 'seizure' || selectedType === 'infection' || selectedType === 'sleep') && (
              <div>
                <label className="block text-body font-medium text-text-primary mb-xs">
                  Duration (minutes) {detailMode && <span className="text-semantic-critical">*</span>}
                </label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 5"
                  min="0"
                />
              </div>
            )}

            {/* Quick context toggles */}
            <div>
              <p className="text-body font-medium text-text-primary mb-xs">Context (optional)</p>
              <div className="flex gap-xs flex-wrap">
                <button
                  type="button"
                  onClick={() => setAfterSleep(!afterSleep)}
                  className={`px-sm py-1 text-meta rounded-full border transition-colors ${
                    afterSleep
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-divider text-text-secondary hover:border-purple-300'
                  }`}
                >
                  😴 After sleep
                </button>
                <button
                  type="button"
                  onClick={() => setAfterMeds(!afterMeds)}
                  className={`px-sm py-1 text-meta rounded-full border transition-colors ${
                    afterMeds
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-divider text-text-secondary hover:border-purple-300'
                  }`}
                >
                  💊 After medication
                </button>
                <button
                  type="button"
                  onClick={() => setWhileIll(!whileIll)}
                  className={`px-sm py-1 text-meta rounded-full border transition-colors ${
                    whileIll
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-divider text-text-secondary hover:border-purple-300'
                  }`}
                >
                  🦠 While unwell
                </button>
              </div>
            </div>

            {/* Quick phrases */}
            {quickPhrases.length > 0 && (
              <div>
                <p className="text-body font-medium text-text-primary mb-xs">Quick phrases</p>
                <div className="flex gap-xs flex-wrap">
                  {quickPhrases.map((phrase) => (
                    <button
                      key={phrase}
                      type="button"
                      onClick={() => handleQuickPhrase(phrase)}
                      className="px-sm py-1 text-meta border border-divider rounded-md hover:border-purple-300 hover:bg-purple-50"
                    >
                      + {phrase}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes - always visible */}
            <div>
              <label className="block text-body font-medium text-text-primary mb-xs">
                Notes
              </label>
              <Textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Any additional details..."
                rows={detailMode ? 4 : 2}
              />
            </div>

            {/* Detailed mode extras */}
            {detailMode && (
              <div className="space-y-sm pt-sm border-t border-divider">
                <p className="text-body font-medium text-text-primary">Additional details</p>

                {/* Backdate */}
                <div>
                  <label className="block text-meta text-text-secondary mb-xs">
                    When did this happen?
                  </label>
                  <Input
                    type="datetime-local"
                    value={backdateTime}
                    onChange={(e) => setBackdateTime(e.target.value)}
                  />
                  <p className="text-caption text-text-secondary mt-xs">
                    Leave blank for now
                  </p>
                </div>

                {/* Scope categories */}
                <div>
                  <label className="block text-meta text-text-secondary mb-xs">
                    Categories for this observation
                  </label>
                  <div className="flex flex-wrap gap-xs">
                    {scopes.map((scope) => (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() =>
                          setSelectedScopes((prev) =>
                            prev.includes(scope.code)
                              ? prev.filter((c) => c !== scope.code)
                              : [...prev, scope.code]
                          )
                        }
                        className={`px-sm py-1 text-meta rounded-sm border transition-colors ${
                          selectedScopes.includes(scope.code)
                            ? 'border-purple-600 bg-purple-50 text-purple-700 font-medium'
                            : 'border-divider text-text-secondary hover:border-purple-300'
                        }`}
                      >
                        {scope.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-sm pt-sm">
              <Button
                onClick={handleSubmit}
                loading={saving}
                disabled={saving || !severity}
                className="flex-1"
              >
                {saving ? 'Saving...' : 'Save observation'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>

            {formError && (
              <p className="text-caption text-semantic-critical">{formError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
