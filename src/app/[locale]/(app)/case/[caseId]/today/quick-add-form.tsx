'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button, Input, Textarea } from '@/components/ui'
import { createEvent } from '@/actions/event'
import { EVENT_TYPES, type EventType } from '@/lib/event-types'
import { useOffline } from '@/lib/offline/context'
import { createEventOffline } from '@/lib/offline/sync'
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
}

export function QuickAddForm({ caseId, scopes }: QuickAddFormProps) {
  const t = useTranslations('quickAdd')
  const router = useRouter()
  const { data: session } = useSession()
  const { isOnline, refreshStatus } = useOffline()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedType, setSelectedType] = useState<EventType | null>(null)
  const [freeText, setFreeText] = useState('')
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

  function handleTypeSelect(type: EventType) {
    setSelectedType(type)
    // Set default scopes for the type
    setSelectedScopes([...EVENT_TYPES[type].defaultScopes])
    setQuickContextScopes([])
    setFormError('')

    // Auto-submit "nothing new" immediately
    if (type === 'nothing_new') {
      handleSubmit(type)
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
    photoValue,
    onSuccess,
    setError,
  }: {
    eventType: EventType
    freeTextValue?: string
    occurredAtValue?: string
    scopeCodesValue?: string[]
    photoValue?: File | null
    onSuccess?: () => void
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

      onSuccess?.()

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
      photoValue: photo,
      setError: setFormError,
      onSuccess: () => {
        setSelectedType(null)
        setFreeText('')
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
    setExpanded(false)
    setSelectedScopes([])
    setQuickContextScopes([])
    setBackdateTime('')
    setPhoto(null)
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

        {selectedType && (
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

        {/* Main text input */}
        <Textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder={
            selectedType
              ? t('addDetails', { type: typeConfig?.label.toLowerCase() ?? '' })
              : t('startTyping')
          }
          rows={2}
          onFocus={handleStartTyping}
        />

        {/* Photo upload */}
        {selectedType && (
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
        )}

        {/* Expand/collapse for additional options */}
        {selectedType && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-meta text-accent-primary hover:underline"
          >
            {t('moreOptions')}
          </button>
        )}

        {/* Expanded options */}
        {selectedType && expanded && (
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

        {formError && <p className="text-caption text-semantic-critical">{formError}</p>}

        {/* Submit */}
        <div className="flex gap-sm pt-xs">
          <Button
            onClick={() => handleSubmit()}
            loading={saving}
            disabled={!selectedType || saving}
          >
            {t('save')}
          </Button>
        </div>
        </section>
      </div>
    </div>
  )
}
