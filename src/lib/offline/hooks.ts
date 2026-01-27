'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getOfflineDb, type CachedEvent, type CachedProfile } from './db'
import {
  createEventOffline,
  updateEventOffline,
  deleteEventOffline,
  updateProfileOffline,
  cacheEventsFromServer,
  cacheProfile,
  cacheScopes,
  type CreateEventInput,
} from './sync'
import { useOffline } from './context'

// ============================================================================
// EVENT HOOKS
// ============================================================================

interface UseOfflineEventsResult {
  events: CachedEvent[]
  loading: boolean
  createEvent: (input: Omit<CreateEventInput, 'caseId'>) => Promise<CachedEvent>
  updateEvent: (
    localId: string,
    updates: { freeText?: string; occurredAt?: Date; scopeCodes?: string[] }
  ) => Promise<void>
  deleteEvent: (localId: string) => Promise<void>
  cacheFromServer: (
    events: Parameters<typeof cacheEventsFromServer>[1]
  ) => Promise<void>
}

export function useOfflineEvents(caseId: string): UseOfflineEventsResult {
  const { refreshStatus } = useOffline()

  // Live query for events - updates automatically when IndexedDB changes
  const events = useLiveQuery(
    async () => {
      const db = getOfflineDb()
      return db.events
        .where('caseId')
        .equals(caseId)
        .filter((e) => !e.deletedAt)
        .reverse()
        .sortBy('occurredAt')
    },
    [caseId],
    []
  )

  const createEvent = useCallback(
    async (input: Omit<CreateEventInput, 'caseId'>) => {
      const event = await createEventOffline({ ...input, caseId })
      refreshStatus()
      return event
    },
    [caseId, refreshStatus]
  )

  const updateEvent = useCallback(
    async (
      localId: string,
      updates: { freeText?: string; occurredAt?: Date; scopeCodes?: string[] }
    ) => {
      await updateEventOffline(localId, updates)
      refreshStatus()
    },
    [refreshStatus]
  )

  const deleteEvent = useCallback(
    async (localId: string) => {
      await deleteEventOffline(localId)
      refreshStatus()
    },
    [refreshStatus]
  )

  const cacheFromServer = useCallback(
    async (events: Parameters<typeof cacheEventsFromServer>[1]) => {
      await cacheEventsFromServer(caseId, events)
    },
    [caseId]
  )

  return {
    events: events || [],
    loading: events === undefined,
    createEvent,
    updateEvent,
    deleteEvent,
    cacheFromServer,
  }
}

// ============================================================================
// PROFILE HOOKS
// ============================================================================

interface UseOfflineProfileResult {
  profile: CachedProfile | null
  loading: boolean
  updateProfile: (updates: Partial<CachedProfile>) => Promise<void>
  cacheFromServer: (profile: CachedProfile) => Promise<void>
}

export function useOfflineProfile(caseId: string): UseOfflineProfileResult {
  const { refreshStatus } = useOffline()

  const profile = useLiveQuery(
    async () => {
      const db = getOfflineDb()
      return db.profiles.get(caseId) || null
    },
    [caseId],
    null
  )

  const updateProfile = useCallback(
    async (updates: Partial<CachedProfile>) => {
      await updateProfileOffline(caseId, updates)
      refreshStatus()
    },
    [caseId, refreshStatus]
  )

  const cacheFromServer = useCallback(async (serverProfile: CachedProfile) => {
    await cacheProfile(serverProfile)
  }, [])

  return {
    profile: profile ?? null,
    loading: profile === undefined,
    updateProfile,
    cacheFromServer,
  }
}

// ============================================================================
// SCOPE HOOKS
// ============================================================================

export function useOfflineScopes() {
  const scopes = useLiveQuery(
    async () => {
      const db = getOfflineDb()
      return db.scopes.toArray()
    },
    [],
    []
  )

  const cache = useCallback(
    async (serverScopes: { id: string; code: string; label: string }[]) => {
      await cacheScopes(serverScopes)
    },
    []
  )

  return {
    scopes: scopes || [],
    loading: scopes === undefined,
    cacheFromServer: cache,
  }
}

// ============================================================================
// COMBINED HOOK FOR PAGE DATA
// ============================================================================

interface UseOfflineDataOptions {
  caseId: string
  fetchServerData?: boolean
}

interface UseOfflineDataResult {
  events: CachedEvent[]
  profile: CachedProfile | null
  loading: boolean
  isStale: boolean
  refresh: () => Promise<void>
}

export function useOfflineData({
  caseId,
  fetchServerData = true,
}: UseOfflineDataOptions): UseOfflineDataResult {
  const { isOnline, refreshStatus } = useOffline()
  const [serverLoading, setServerLoading] = useState(fetchServerData && isOnline)
  const [isStale, setIsStale] = useState(false)

  const eventsHook = useOfflineEvents(caseId)
  const profileHook = useOfflineProfile(caseId)

  // Fetch from server and cache
  const fetchAndCache = useCallback(async () => {
    if (!isOnline) return

    setServerLoading(true)
    try {
      // Fetch events from server
      const eventsResponse = await fetch(`/api/sync/events?caseId=${caseId}`)
      if (eventsResponse.ok) {
        const serverEvents = await eventsResponse.json()
        await eventsHook.cacheFromServer(serverEvents)
      }

      // Fetch profile from server
      const profileResponse = await fetch(`/api/sync/profile?caseId=${caseId}`)
      if (profileResponse.ok) {
        const serverProfile = await profileResponse.json()
        await profileHook.cacheFromServer(serverProfile)
      }

      // Fetch scopes
      const scopesResponse = await fetch('/api/sync/scopes')
      if (scopesResponse.ok) {
        const serverScopes = await scopesResponse.json()
        await cacheScopes(serverScopes)
      }

      setIsStale(false)
    } catch (error) {
      console.error('Failed to fetch server data:', error)
      setIsStale(true)
    } finally {
      setServerLoading(false)
    }
  }, [caseId, isOnline, eventsHook, profileHook])

  // Initial fetch
  useEffect(() => {
    if (fetchServerData && isOnline) {
      fetchAndCache()
    }
  }, []) // Only on mount

  // Check staleness
  useEffect(() => {
    if (profileHook.profile?.cachedAt) {
      const age = Date.now() - profileHook.profile.cachedAt.getTime()
      // Consider stale after 5 minutes
      setIsStale(age > 5 * 60 * 1000)
    }
  }, [profileHook.profile])

  return {
    events: eventsHook.events,
    profile: profileHook.profile,
    loading: eventsHook.loading || profileHook.loading || serverLoading,
    isStale,
    refresh: async () => {
      await fetchAndCache()
      await refreshStatus()
    },
  }
}
