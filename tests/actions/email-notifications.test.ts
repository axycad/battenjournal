/**
 * Server Action Tests
 * 
 * These tests verify the logic of server actions by mocking
 * the auth and database layers.
 */

// Define mocks before jest.mock calls to avoid hoisting issues
const mockAuth = jest.fn()
const mockPrisma = {
  emailPreference: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  membership: {
    findMany: jest.fn(),
  },
  thread: {
    findMany: jest.fn(),
  },
  threadRead: {
    findUnique: jest.fn(),
  },
  message: {
    findMany: jest.fn(),
  },
}

// Mock modules using factory functions that reference the pre-defined mocks
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    emailPreference: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
    },
    thread: {
      findMany: jest.fn(),
    },
    threadRead: {
      findUnique: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

// Import mocked modules after jest.mock
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Cast to jest.Mock for type safety
const mockedAuth = auth as jest.Mock
const mockedPrisma = prisma as typeof mockPrisma

import {
  getEmailPreferences,
  updateEmailPreferences,
  unsubscribeByToken,
} from '@/actions/email-notifications'

describe('Email Notification Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getEmailPreferences', () => {
    it('returns null when not authenticated', async () => {
      mockedAuth.mockResolvedValue(null)

      const result = await getEmailPreferences()

      expect(result).toBeNull()
    })

    it('returns defaults when no preferences exist', async () => {
      mockedAuth.mockResolvedValue({ user: { id: 'user-1' } })
      mockedPrisma.emailPreference.findUnique.mockResolvedValue(null)

      const result = await getEmailPreferences()

      expect(result).toEqual({
        digestFrequency: 'DAILY',
        watchAlerts: true,
        taskReminders: true,
        messageNotifications: true,
      })
    })

    it('returns stored preferences', async () => {
      mockedAuth.mockResolvedValue({ user: { id: 'user-1' } })
      mockedPrisma.emailPreference.findUnique.mockResolvedValue({
        digestFrequency: 'WEEKLY',
        watchAlerts: false,
        taskReminders: true,
        messageNotifications: false,
      })

      const result = await getEmailPreferences()

      expect(result).toEqual({
        digestFrequency: 'WEEKLY',
        watchAlerts: false,
        taskReminders: true,
        messageNotifications: false,
      })
    })
  })

  describe('updateEmailPreferences', () => {
    it('returns error when not authenticated', async () => {
      mockedAuth.mockResolvedValue(null)

      const result = await updateEmailPreferences({ digestFrequency: 'DAILY' })

      expect(result).toEqual({ success: false, error: 'Not authenticated' })
    })

    it('updates preferences successfully', async () => {
      mockedAuth.mockResolvedValue({ user: { id: 'user-1' } })
      mockedPrisma.emailPreference.upsert.mockResolvedValue({})

      const result = await updateEmailPreferences({
        digestFrequency: 'WEEKLY',
        watchAlerts: false,
      })

      expect(result).toEqual({ success: true })
      expect(mockedPrisma.emailPreference.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: expect.objectContaining({
          digestFrequency: 'WEEKLY',
          watchAlerts: false,
        }),
        create: expect.objectContaining({
          userId: 'user-1',
          digestFrequency: 'WEEKLY',
          watchAlerts: false,
        }),
      })
    })
  })

  describe('unsubscribeByToken', () => {
    it('returns error for invalid token', async () => {
      mockedPrisma.emailPreference.findUnique.mockResolvedValue(null)

      const result = await unsubscribeByToken('invalid-token')

      expect(result).toEqual({ success: false, error: 'Invalid unsubscribe link' })
    })

    it('unsubscribes successfully with valid token', async () => {
      mockedPrisma.emailPreference.findUnique.mockResolvedValue({
        id: 'pref-1',
        unsubscribeToken: 'valid-token',
      })
      mockedPrisma.emailPreference.update.mockResolvedValue({})

      const result = await unsubscribeByToken('valid-token')

      expect(result).toEqual({ success: true })
      expect(mockedPrisma.emailPreference.update).toHaveBeenCalledWith({
        where: { id: 'pref-1' },
        data: { digestFrequency: 'OFF' },
      })
    })
  })
})
