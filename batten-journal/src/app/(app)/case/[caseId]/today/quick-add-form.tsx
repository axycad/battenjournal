'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button, Input, Textarea } from '@/components/ui'
import { createEvent, EVENT_TYPES, type EventType } from '@/actions/event'
import { useOffline } from '@/lib/offline/context'
import { createEventOffline } from '@/lib/offline/sync'
import type { Scope } from '@prisma/client'

interface QuickAddFormProps {
  caseId: string
  scopes: Scope[]
}

export function QuickAddForm({ caseId, scopes }: QuickAddFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { isOnline, refreshStatus } = useOffline()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedType, setSelectedType] = useState<EventType | null>(null)
  const [freeText, setFreeText] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [backdateTime, setBackdateTime] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleTypeSelect(type: EventType) {
    setSelectedType(type)
    // Set default scopes for the type
    setSelectedScopes([...EVENT_TYPES[type].defaultScopes])
    setError('')

    // Auto-submit "nothing new" immediately
    if (type === 'nothing_new') {
      handleSubmit(type)
    }
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif']
      if (!validTypes.includes(file.type)) {
        setError('Only images (JPG, PNG, HEIC) are allowed')
        return
      }
      // Validate size
      if (file.size > 25 * 1024 * 1024) {
        setError('This file is larger than 25MB')
        return
      }
      setPhoto(file)
      setError('')
    }
  }

  function removePhoto() {
    setPhoto(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(typeOverride?: EventType) {
    const eventType = typeOverride || selectedType
    if (!eventType) return

    setSaving(true)
    setError('')

    try {
      let eventId: string | undefined

      if (isOnline) {
        // Online: use server action
        const result = await createEvent(caseId, {
          eventType,
          freeText: freeText.trim() || undefined,
          occurredAt: backdateTime || undefined,
          scopeCodes: expanded ? selectedScopes : undefined,
        })

        if (!result.success) {
          setError(result.error || 'Failed to save')
          setSaving(false)
          return
        }

        eventId = result.data?.eventId
      } else {
        // Offline: save locally
        const scopesToUse = expanded
          ? selectedScopes
          : EVENT_TYPES[eventType].defaultScopes

        await createEventOffline({
          caseId,
          eventType,
          freeText: freeText.trim() || undefined,
          occurredAt: backdateTime ? new Date(backdateTime) : undefined,
          scopeCodes: scopesToUse,
          authorUserId: session?.user?.id || '',
          authorName: session?.user?.name || undefined,
        })

        await refreshStatus()
      }

      // Upload photo if present and online
      if (photo && eventId && isOnline) {
        try {
          const formData = new FormData()
          formData.append('file', photo)
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
      } else if (photo && !isOnline) {
        // Photo uploads not supported offline
        console.log('Photo will not be uploaded - offline mode')
      }

      // Reset form
      setSelectedType(null)
      setFreeText('')
      setExpanded(false)
      setSelectedScopes([])
      setBackdateTime('')
      setPhoto(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Refresh to show new event
      router.refresh()
    } catch (e) {
      console.error('Submit error:', e)
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
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
    setBackdateTime('')
    setPhoto(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setError('')
  }

  // Event type grid (when nothing selected)
  if (!selectedType) {
    return (
      <div className="p-md bg-white border border-divider rounded-md">
        <h2 className="text-meta text-text-secondary mb-sm">Log an observation</h2>
        <div className="grid grid-cols-2 gap-xs">
          {(Object.entries(EVENT_TYPES) as [EventType, typeof EVENT_TYPES[EventType]][]).map(
            ([type, config]) => (
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
            )
          )}
        </div>
      </div>
    )
  }

  // Quick capture form (type selected)
  const typeConfig = EVENT_TYPES[selectedType]

  return (
    <div className="p-md bg-white border border-divider rounded-md">
      <div className="flex items-center justify-between mb-sm">
        <h2 className="section-header">{typeConfig.label}</h2>
        <Button
          variant="text"
          onClick={handleCancel}
          className="h-auto px-0 text-meta"
        >
          Cancel
        </Button>
      </div>

      <div className="space-y-sm">
        {/* Main text input */}
        <Textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder="What happened? (optional)"
          rows={2}
          autoFocus
        />

        {/* Photo upload */}
        <div>
          <label className="block text-meta text-text-secondary mb-xs">
            Add photo (optional)
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
                Remove
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

        {/* Expand/collapse for additional options */}
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-meta text-accent-primary hover:underline"
          >
            More options
          </button>
        )}

        {/* Expanded options */}
        {expanded && (
          <div className="space-y-sm pt-sm border-t border-divider">
            {/* Backdate option */}
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

            {/* Scope picker */}
            <div>
              <label className="block text-meta text-text-secondary mb-xs">
                Categories
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

        {error && <p className="text-caption text-semantic-critical">{error}</p>}

        {/* Submit */}
        <div className="flex gap-sm pt-xs">
          <Button onClick={() => handleSubmit()} loading={saving}>
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
