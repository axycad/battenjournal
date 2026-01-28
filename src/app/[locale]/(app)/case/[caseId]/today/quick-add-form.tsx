'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button, Input, Textarea, SeveritySlider } from '@/components/ui'
import { createEvent, updateEvent, type EventWithScopes } from '@/actions/event'
import { EVENT_TYPES, type EventType, type SeverityLevel } from '@/lib/event-types'
import { useOffline } from '@/lib/offline/context'
import { createEventOffline } from '@/lib/offline/sync'
import { MiniTrendChart } from '@/components/events/mini-trend-chart'
import type { Scope } from '@prisma/client'

type CheckInStatus = 'better' | 'same' | 'worse' | 'unsure'

const QUICK_TYPES: EventType[] = [
  'seizure',
  'medication',
  'feeding',
  'sleep',
  'comfort',
  'general',
]

interface QuickAddFormProps {
  caseId: string
  scopes: Scope[]
  events?: EventWithScopes[]
}

export function QuickAddForm({ caseId, scopes, events = [] }: QuickAddFormProps) {
  const t = useTranslations('quickAdd')
  const router = useRouter()
  const { data: session } = useSession()
  const { isOnline, refreshStatus } = useOffline()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedType, setSelectedType] = useState<EventType | null>(null)
  const [freeText, setFreeText] = useState('')
  const [severity, setSeverity] = useState<SeverityLevel | undefined>(undefined)
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus | null>(null)
  const [checkInNote, setCheckInNote] = useState('')
  const [checkInContexts, setCheckInContexts] = useState<string[]>([])
  const [quickContextScopes, setQuickContextScopes] = useState<string[]>([])
  const [expanded, setExpanded] = useState(false)
  const [showAllTypes, setShowAllTypes] = useState(false)
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [backdateTime, setBackdateTime] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [checkInError, setCheckInError] = useState('')
  const [justSavedEventId, setJustSavedEventId] = useState<string | null>(null)
  const [showAddDetails, setShowAddDetails] = useState(false)

  // Load severity default from localStorage
  function getDefaultSeverity(eventType: EventType): SeverityLevel | undefined {
    try {
      const stored = localStorage.getItem(`severity-default-${eventType}`)
      return stored ? (parseInt(stored) as SeverityLevel) : undefined
    } catch {
      return undefined
    }
  }

  // Save severity default to localStorage
  function saveDefaultSeverity(eventType: EventType, severity: SeverityLevel) {
    try {
      localStorage.setItem(`severity-default-${eventType}`, severity.toString())
    } catch {
      // Ignore localStorage errors
    }
  }

  function handleTypeSelect(type: EventType) {
    setSelectedType(type)
    // Set default scopes for the type
    setSelectedScopes([...EVENT_TYPES[type].defaultScopes])
    setQuickContextScopes([])
    setFormError('')
    setJustSavedEventId(null)
    setShowAddDetails(false)

    // Load saved severity default for this event type
    const defaultSeverity = getDefaultSeverity(type)
    if (defaultSeverity) {
      setSeverity(defaultSeverity)
    } else {
      setSeverity(undefined)
    }

    // Auto-submit "nothing new" immediately
    if (type === 'nothing_new') {
      handleSubmit(type)
    }
  }

  async function handleSeverityChange(newSeverity: SeverityLevel) {
    setSeverity(newSeverity)

    // Save as default for this event type
    if (selectedType) {
      saveDefaultSeverity(selectedType, newSeverity)
    }

    // Auto-save if event type is selected and not already saved
    if (selectedType && !justSavedEventId) {
      // Build scope set
      const scopeSet = new Set<string>()
      EVENT_TYPES[selectedType].defaultScopes.forEach((code) => scopeSet.add(code))
      quickContextScopes.forEach((code) => scopeSet.add(code))
      const scopeCodesValue = scopeSet.size > 0 ? Array.from(scopeSet) : undefined

      await saveEvent({
        eventType: selectedType,
        severityValue: newSeverity,
        scopeCodesValue,
        setError: setFormError,
        onSuccess: (eventId) => {
          setJustSavedEventId(eventId || null)
          // Don't reset form - keep it ready for "Add details"
        },
      })
    }
  }

  function handleStartTyping() {
    if (!selectedType) {
      handleTypeSelect('general')
    }
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif']
      if (!validTypes.includes(file.type)) {
        setFormError(t('errorInvalidImage'))
        return
      }
      // Validate size
      if (file.size > 25 * 1024 * 1024) {
        setFormError(t('errorFileTooLarge'))
        return
      }
      setPhoto(file)
      setFormError('')
    }
  }

  function removePhoto() {
    setPhoto(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function saveEvent({
    eventType,
    freeTextValue,
    occurredAtValue,
    scopeCodesValue,
    severityValue,
    photoValue,
    onSuccess,
    setError,
  }: {
    eventType: EventType
    freeTextValue?: string
    occurredAtValue?: string
    scopeCodesValue?: string[]
    severityValue?: SeverityLevel
    photoValue?: File | null
    onSuccess?: (eventId?: string) => void
    setError: (message: string) => void
  }) {
    setSaving(true)
    setError('')

    try {
      let eventId: string | undefined

      if (isOnline) {
        // Online: use server action
        const result = await createEvent(caseId, {
          eventType,
          freeText: freeTextValue?.trim() || undefined,
          occurredAt: occurredAtValue || undefined,
          scopeCodes: scopeCodesValue,
          severity: severityValue,
        })

        if (!result.success) {
          setError(result.error || t('errorFailedSave'))
          setSaving(false)
          return
        }

        eventId = result.data?.eventId
      } else {
        // Offline: save locally
        const scopesToUse = scopeCodesValue ?? [...EVENT_TYPES[eventType].defaultScopes]

        await createEventOffline({
          caseId,
          eventType,
          freeText: freeTextValue?.trim() || undefined,
          occurredAt: occurredAtValue ? new Date(occurredAtValue) : undefined,
          scopeCodes: scopesToUse,
          authorUserId: session?.user?.id || '',
          authorName: session?.user?.name || undefined,
        })

        await refreshStatus()
      }

      // Upload photo if present and online
      if (photoValue && eventId && isOnline) {
        try {
          const formData = new FormData()
          formData.append('file', photoValue)
          formData.append('caseId', caseId)
          formData.append('eventId', eventId)

          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (!uploadResponse.ok) {
            const uploadResult = await uploadResponse.json()
            console.error('Photo upload failed:', uploadResult.error)
          }
        } catch (e) {
          console.error('Photo upload error:', e)
        }
      } else if (photoValue && !isOnline) {
        // Photo uploads not supported offline
        console.log('Photo will not be uploaded - offline mode')
      }

      onSuccess?.(eventId)

      // Refresh to show new event
      router.refresh()
    } catch (e) {
      console.error('Submit error:', e)
      setError(t('errorFailedSave'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(typeOverride?: EventType) {
    const eventType = typeOverride || selectedType
    if (!eventType) return

    const scopeSet = new Set<string>()
    if (expanded) {
      selectedScopes.forEach((code) => scopeSet.add(code))
    } else if (quickContextScopes.length > 0) {
      EVENT_TYPES[eventType].defaultScopes.forEach((code) => scopeSet.add(code))
    }
    quickContextScopes.forEach((code) => scopeSet.add(code))
    const scopeCodesValue = scopeSet.size > 0 ? Array.from(scopeSet) : undefined

    await saveEvent({
      eventType,
      freeTextValue: freeText.trim() || undefined,
      occurredAtValue: backdateTime || undefined,
      scopeCodesValue,
      severityValue: severity,
      photoValue: photo,
      setError: setFormError,
      onSuccess: () => {
        setSelectedType(null)
        setFreeText('')
        setSeverity(undefined)
        setExpanded(false)
        setSelectedScopes([])
        setQuickContextScopes([])
        setBackdateTime('')
        setPhoto(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      },
    })
  }

  async function handleUpdateDetails() {
    if (!justSavedEventId) return

    setSaving(true)
    setFormError('')

    try {
      // Upload photo if present
      if (photo && isOnline) {
        try {
          const formData = new FormData()
          formData.append('file', photo)
          formData.append('caseId', caseId)
          formData.append('eventId', justSavedEventId)

          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (!uploadResponse.ok) {
            const uploadResult = await uploadResponse.json()
            console.error('Photo upload failed:', uploadResult.error)
          }
        } catch (e) {
          console.error('Photo upload error:', e)
        }
      }

      // Build scope set
      const scopeSet = new Set<string>()
      if (expanded && selectedScopes.length > 0) {
        selectedScopes.forEach((code) => scopeSet.add(code))
      } else if (selectedType) {
        EVENT_TYPES[selectedType].defaultScopes.forEach((code) => scopeSet.add(code))
        quickContextScopes.forEach((code) => scopeSet.add(code))
      }

      // Update the event
      const result = await updateEvent(justSavedEventId, {
        freeText: freeText.trim() || undefined,
        occurredAt: backdateTime || undefined,
        scopeCodes: scopeSet.size > 0 ? Array.from(scopeSet) : undefined,
        severity,
      })

      if (!result.success) {
        setFormError(result.error || t('errorFailedSave'))
      } else {
        // Reset form after successful update
        setShowAddDetails(false)
        setJustSavedEventId(null)
        setSelectedType(null)
        setFreeText('')
        setSeverity(undefined)
        setExpanded(false)
        setSelectedScopes([])
        setQuickContextScopes([])
        setBackdateTime('')
        setPhoto(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        router.refresh()
      }
    } catch (e) {
      console.error('Update error:', e)
      setFormError(t('errorFailedSave'))
    } finally {
      setSaving(false)
    }
  }

  const contextMarkers: { id: string; label: string; scopeCode: string }[] = [
    { id: 'sleep', label: t('contextSleep'), scopeCode: 'sleep' },
    { id: 'meds', label: t('contextMeds'), scopeCode: 'meds' },
    { id: 'illness', label: t('contextIllness'), scopeCode: 'infection' },
  ]

  const checkInOptions: {
    id: CheckInStatus
    label: string
    helper: string
    activeClass: string
  }[] = [
    {
      id: 'better',
      label: t('better'),
      helper: t('betterHelper'),
      activeClass: 'border-semantic-success bg-semantic-success/10 text-semantic-success',
    },
    {
      id: 'same',
      label: t('steadier'),
      helper: t('sameHelper'),
      activeClass: 'border-accent-primary bg-accent-primary/10 text-accent-primary',
    },
    {
      id: 'worse',
      label: t('tougher'),
      helper: t('tougherHelper'),
      activeClass: 'border-semantic-critical bg-semantic-critical/10 text-semantic-critical',
    },
    {
      id: 'unsure',
      label: t('unsure'),
      helper: t('unsureHelper'),
      activeClass: 'border-divider bg-bg-primary text-text-secondary',
    },
  ]

  function buildCheckInText(status: CheckInStatus, note: string, contexts: string[]) {
    const option = checkInOptions.find((item) => item.id === status)
    const baseText = option ? option.helper : t('checkInFallback')
    const contextLabels = contexts
      .map((contextId) => contextMarkers.find((c) => c.id === contextId)?.label)
      .filter(Boolean) as string[]

    const contextText = contextLabels.length > 0
      ? ` ${t('contextLabel')}: ${contextLabels.join(', ')}.`
      : ''

    const token = `[checkin:${status}]`
    if (!note.trim()) {
      return `${token} ${t('checkInPrefix')}: ${baseText}.${contextText}`
    }
    return `${token} ${t('checkInPrefix')}: ${baseText}. ${note.trim()}${contextText}`
  }

  async function handleCheckInSave(statusOverride?: CheckInStatus) {
    const status = statusOverride || checkInStatus
    if (!status) return

    const contextScopeCodes = contextMarkers
      .filter((context) => checkInContexts.includes(context.id))
      .map((context) => context.scopeCode)

    await saveEvent({
      eventType: 'daily_checkin',
      freeTextValue: buildCheckInText(status, checkInNote, checkInContexts),
      scopeCodesValue: contextScopeCodes.length > 0 ? contextScopeCodes : undefined,
      setError: setCheckInError,
      onSuccess: () => {
        setCheckInStatus(null)
        setCheckInNote('')
        setCheckInContexts([])
      },
    })
  }

  async function handleNothingNew() {
    await saveEvent({
      eventType: 'nothing_new',
      setError: setCheckInError,
      onSuccess: () => {
        setCheckInStatus(null)
        setCheckInNote('')
        setCheckInContexts([])
      },
    })
  }

  function toggleScope(code: string) {
    setSelectedScopes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  function handleCancel() {
    setSelectedType(null)
    setFreeText('')
    setSeverity(undefined)
    setExpanded(false)
    setSelectedScopes([])
    setQuickContextScopes([])
    setBackdateTime('')
    setPhoto(null)
    setJustSavedEventId(null)
    setShowAddDetails(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setFormError('')
  }

  const typeConfig = selectedType ? EVENT_TYPES[selectedType] : null

  return (
    <div className="p-md bg-white border border-divider rounded-md">
      <div className="space-y-md">
        <section className="space-y-sm">
          <div>
            <h2 className="section-header">{t('quickCheckIn')}</h2>
            <p className="text-meta text-text-secondary">
              {t('howAreThings')}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-xs">
            {checkInOptions.map((option) => {
              const isActive = checkInStatus === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setCheckInStatus(option.id)
                    setCheckInError('')
                  }}
                  disabled={saving}
                  className={`px-sm py-2 text-meta rounded-full border transition-colors ${
                    isActive
                      ? option.activeClass
                      : 'border-divider text-text-secondary hover:border-accent-primary'
                  }`}
                >
                  <span className="block text-body font-medium">{option.label}</span>
                  <span className="block text-caption">{option.helper}</span>
                </button>
              )
            })}
          </div>

          {checkInStatus && (
            <div className="space-y-sm">
              <Textarea
                value={checkInNote}
                onChange={(e) => setCheckInNote(e.target.value)}
                placeholder={t('anythingNotable')}
                rows={2}
              />
              <div>
                <p className="text-meta text-text-secondary mb-xs">
                  {t('contextMarkers')}
                </p>
                <div className="flex flex-wrap gap-xs">
                  {contextMarkers.map((context) => {
                    const isActive = checkInContexts.includes(context.id)
                    return (
                      <button
                        key={context.id}
                        type="button"
                        onClick={() =>
                          setCheckInContexts((prev) =>
                            prev.includes(context.id)
                              ? prev.filter((id) => id !== context.id)
                              : [...prev, context.id]
                          )
                        }
                        className={`px-sm py-1 text-meta rounded-full border transition-colors ${
                          isActive
                            ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                            : 'border-divider text-text-secondary hover:border-accent-primary'
                        }`}
                      >
                        {context.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-sm">
                <Button
                  onClick={() => handleCheckInSave()}
                  loading={saving}
                  disabled={saving}
                >
                  {t('saveCheckIn')}
                </Button>
                <button
                  type="button"
                  onClick={handleNothingNew}
                  className="text-meta text-text-secondary hover:text-accent-primary"
                >
                  {t('nothingNew')}
                </button>
                <span className="text-caption text-text-secondary">
                  {t('missedDaysOk')}
                </span>
              </div>
            </div>
          )}

          {!checkInStatus && (
            <div className="flex flex-wrap items-center gap-sm">
              <button
                type="button"
                onClick={handleNothingNew}
                disabled={saving}
                className="px-sm py-2 text-meta rounded-full border border-divider text-text-secondary hover:border-accent-primary"
              >
                {t('nothingNew')}
              </button>
              <span className="text-caption text-text-secondary">
                {t('missedDaysOk')}
              </span>
            </div>
          )}

          {checkInError && (
            <p className="text-caption text-semantic-critical">{checkInError}</p>
          )}
        </section>

        <div className="divider" />

        <section className="space-y-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-header">{t('logObservation')}</h2>
              <p className="text-meta text-text-secondary">
                {t('chooseType')}
              </p>
            </div>
            {selectedType && (
              <Button
                variant="text"
                onClick={handleCancel}
                className="h-auto px-0 text-meta"
              >
                {t('clear')}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-xs">
            {QUICK_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => handleTypeSelect(type)}
                disabled={saving}
                className={`px-sm py-1 text-meta rounded-full border transition-colors ${
                selectedType === type
                  ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                  : 'border-divider text-text-secondary hover:border-accent-primary'
              }`}
            >
              {EVENT_TYPES[type].label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAllTypes((prev) => !prev)}
            className="px-sm py-1 text-meta rounded-full border border-divider text-text-secondary hover:border-accent-primary"
          >
            {showAllTypes ? t('lessTypes') : t('moreTypes')}
          </button>
        </div>

        {selectedType && !justSavedEventId && (
          <>
            {/* Show mini trend for repeat event types */}
            {events.filter((e) => e.eventType === selectedType).length > 0 && (
              <MiniTrendChart
                events={events.map((e) => ({
                  id: e.id,
                  eventType: e.eventType,
                  occurredAt: e.occurredAt,
                  severity: e.severity,
                }))}
                eventType={selectedType}
                label={`${EVENT_TYPES[selectedType].label} history`}
              />
            )}

            <div>
              <p className="text-meta text-text-secondary mb-xs">
                {t('contextMarkers')}
              </p>
              <div className="flex flex-wrap gap-xs">
                {contextMarkers.map((context) => {
                  const isActive = quickContextScopes.includes(context.scopeCode)
                  return (
                    <button
                      key={context.id}
                      type="button"
                      onClick={() =>
                        setQuickContextScopes((prev) =>
                          prev.includes(context.scopeCode)
                            ? prev.filter((code) => code !== context.scopeCode)
                            : [...prev, context.scopeCode]
                        )
                      }
                      className={`px-sm py-1 text-meta rounded-full border transition-colors ${
                        isActive
                          ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                          : 'border-divider text-text-secondary hover:border-accent-primary'
                      }`}
                    >
                      {context.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <SeveritySlider
              value={severity}
              onChange={handleSeverityChange}
              label={t('severity')}
            />
          </>
        )}

        {/* Success message after auto-save */}
        {justSavedEventId && !showAddDetails && (
          <div className="p-sm bg-semantic-success/10 border border-semantic-success/30 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-sm">
                <span className="text-body text-semantic-success">✓</span>
                <span className="text-body text-text-primary">
                  {t('eventSaved')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDetails(true)}
                className="text-meta text-accent-primary hover:underline"
              >
                {t('addDetails')}
              </button>
            </div>
          </div>
        )}

        {showAllTypes && (
          <div className="grid grid-cols-2 gap-xs">
            {(Object.entries(EVENT_TYPES) as [EventType, typeof EVENT_TYPES[EventType]][])
              .filter(([type]) => !QUICK_TYPES.includes(type) && type !== 'daily_checkin')
              .map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  disabled={saving}
                  className={`p-sm text-left border rounded-sm transition-colors ${
                    type === 'nothing_new'
                      ? 'border-divider text-text-secondary hover:border-accent-primary col-span-2'
                      : 'border-divider hover:border-accent-primary'
                  }`}
                >
                  <span className="text-body">{config.label}</span>
                </button>
              ))}
          </div>
        )}

        {/* Add details form - shown after auto-save */}
        {showAddDetails && justSavedEventId && (
          <div className="space-y-sm p-sm border border-divider rounded-md bg-bg-primary">
            <div className="flex items-center justify-between">
              <h3 className="text-body font-medium">{t('addDetailsTitle')}</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddDetails(false)
                  handleCancel()
                }}
                className="text-meta text-text-secondary hover:text-text-primary"
              >
                {t('done')}
              </button>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-meta text-text-secondary mb-xs">
                {t('notes')}
              </label>
              <Textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder={t('addNotesPlaceholder')}
                rows={2}
              />
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-meta text-text-secondary mb-xs">
                {t('addPhoto')}
              </label>
              {photo ? (
                <div className="flex items-center gap-sm">
                  <span className="text-meta text-text-primary">
                    {photo.name}
                  </span>
                  <Button
                    variant="text"
                    onClick={removePhoto}
                    className="h-auto px-0 text-meta text-text-secondary"
                  >
                    {t('remove')}
                  </Button>
                </div>
              ) : (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/heic,image/heif"
                  onChange={handlePhotoSelect}
                  className="block w-full text-body text-text-primary
                    file:mr-sm file:py-1 file:px-sm
                    file:rounded-sm file:border-0
                    file:text-meta file:font-medium
                    file:bg-accent-primary/10 file:text-accent-primary
                    hover:file:bg-accent-primary/20"
                />
              )}
            </div>

            {/* More options toggle */}
            {!expanded && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-meta text-accent-primary hover:underline"
              >
                {t('moreOptions')}
              </button>
            )}

            {/* Expanded options */}
            {expanded && (
              <div className="space-y-sm pt-sm border-t border-divider">
                {/* Backdate option */}
                <div>
                  <label className="block text-meta text-text-secondary mb-xs">
                    {t('when')}
                  </label>
                  <Input
                    type="datetime-local"
                    value={backdateTime}
                    onChange={(e) => setBackdateTime(e.target.value)}
                  />
                  <p className="text-caption text-text-secondary mt-xs">
                    {t('leaveBlank')}
                  </p>
                </div>

                {/* Scope picker */}
                <div>
                  <label className="block text-meta text-text-secondary mb-xs">
                    {t('categories')}
                  </label>
                  <div className="flex flex-wrap gap-xs">
                    {scopes.map((scope) => (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() => toggleScope(scope.code)}
                        className={`px-sm py-1 text-meta rounded-sm border transition-colors ${
                          selectedScopes.includes(scope.code)
                            ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                            : 'border-divider text-text-secondary hover:border-accent-primary'
                        }`}
                      >
                        {scope.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Update button */}
            <Button
              onClick={handleUpdateDetails}
              loading={saving}
              disabled={saving}
            >
              {t('updateEvent')}
            </Button>
          </div>
        )}

        {formError && <p className="text-caption text-semantic-critical">{formError}</p>}
        </section>
      </div>
    </div>
  )
}
