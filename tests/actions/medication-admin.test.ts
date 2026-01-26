/**
 * Medication Administration Action Tests
 */

// Mock modules with factory functions
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    membership: {
      findFirst: jest.fn(),
    },
    medication: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    medicationAdministration: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    auditEntry: {
      create: jest.fn(),
    },
  },
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

// Import after mocks
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Cast for type safety
const mockedAuth = auth as jest.Mock
const mockedPrisma = prisma as {
  membership: { findFirst: jest.Mock }
  medication: { findMany: jest.Mock; findFirst: jest.Mock; findUnique: jest.Mock; update: jest.Mock }
  medicationAdministration: { findFirst: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; count: jest.Mock }
  auditEntry: { create: jest.Mock }
}

import {
  logMedicationAdministration,
  skipMedication,
  deleteAdministration,
} from '@/actions/medication-admin'

describe('Medication Administration Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('logMedicationAdministration', () => {
    it('returns error when not authenticated', async () => {
      mockedAuth.mockResolvedValue(null)

      const result = await logMedicationAdministration({
        caseId: 'case-1',
        medicationId: 'med-1',
      })

      expect(result).toEqual({ success: false, error: 'Not authenticated' })
    })

    it('returns error when user has no access', async () => {
      mockedAuth.mockResolvedValue({ user: { id: 'user-1' } })
      mockedPrisma.membership.findFirst.mockResolvedValue(null)

      const result = await logMedicationAdministration({
        caseId: 'case-1',
        medicationId: 'med-1',
      })

      expect(result).toEqual({ success: false, error: 'Access denied' })
    })

    it('returns error when clinician tries to log', async () => {
      mockedAuth.mockResolvedValue({ user: { id: 'user-1' } })
      mockedPrisma.membership.findFirst.mockResolvedValue({
        memberType: 'CARE_TEAM',
      })

      const result = await logMedicationAdministration({
        caseId: 'case-1',
        medicationId: 'med-1',
      })

      expect(result).toEqual({
        success: false,
        error: 'Only parents can log medication administration',
      })
    })

    it('returns error when medication not found', async () => {
      mockedAuth.mockResolvedValue({ user: { id: 'user-1' } })
      mockedPrisma.membership.findFirst.mockResolvedValue({
        memberType: 'PARENT',
        familyRole: 'OWNER_ADMIN',
      })
      mockedPrisma.medication.findFirst.mockResolvedValue(null)

      const result = await logMedicationAdministration({
        caseId: 'case-1',
        medicationId: 'med-1',
      })

      expect(result).toEqual({ success: false, error: 'Medication not found' })
    })

    it('requires PRN reason for PRN medications', async () => {
      mockedAuth.mockResolvedValue({ user: { id: 'user-1' } })
      mockedPrisma.membership.findFirst.mockResolvedValue({
        memberType: 'PARENT',
        familyRole: 'OWNER_ADMIN',
      })
      mockedPrisma.medication.findFirst.mockResolvedValue({
        id: 'med-1',
        isPRN: true,
        dose: '10mg',
      })

      const result = await logMedicationAdministration({
        caseId: 'case-1',
        medicationId: 'med-1',
      })

      expect(result).toEqual({ success: false, error: 'PRN reason is required' })
    })

    it('logs administration successfully', async () => {
      mockedAuth.mockResolvedValue({ user: { id: 'user-1' } })
      mockedPrisma.membership.findFirst.mockResolvedValue({
        memberType: 'PARENT',
        familyRole: 'OWNER_ADMIN',
      })
      mockedPrisma.medication.findFirst.mockResolvedValue({
        id: 'med-1',
        isPRN: false,
        dose: '10mg',
        route: 'oral',
        name: 'Aspirin',
      })
      mockedPrisma.medicationAdministration.create.mockResolvedValue({
        id: 'admin-1',
      })
      mockedPrisma.auditEntry.create.mockResolvedValue({})

      const result = await logMedicationAdministration({
        caseId: 'case-1',
        medicationId: 'med-1',
        dose: '10mg',
        notes: 'Given with food',
      })

      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('admin-1')
      expect(mockedPrisma.medicationAdministration.create).toHaveBeenCalled()
      expect(mockedPrisma.auditEntry.create).toHaveBeenCalled()
    })
  })

  describe('skipMedication', () => {
    it('requires skip reason', async () => {
      mockedAuth.mockResolvedValue({ user: { id: 'user-1' } })
      mockedPrisma.membership.findFirst.mockResolvedValue({
        memberType: 'PARENT',
        familyRole: 'OWNER_ADMIN',
      })

      const result = await skipMedication({
        caseId: 'case-1',
        medicationId: 'med-1',
        skipReason: '',
      })

      expect(result).toEqual({ success: false, error: 'Skip reason is required' })
    })

    it('logs skip successfully', async () => {
      mockedAuth.mockResolvedValue({ user: { id: 'user-1' } })
      mockedPrisma.membership.findFirst.mockResolvedValue({
        memberType: 'PARENT',
        familyRole: 'OWNER_ADMIN',
      })
      mockedPrisma.medication.findFirst.mockResolvedValue({
        id: 'med-1',
        name: 'Aspirin',
      })
      mockedPrisma.medicationAdministration.create.mockResolvedValue({
        id: 'admin-1',
      })

      const result = await skipMedication({
        caseId: 'case-1',
        medicationId: 'med-1',
        skipReason: 'Child was sleeping',
      })

      expect(result.success).toBe(true)
      expect(mockedPrisma.medicationAdministration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            skipped: true,
            skipReason: 'Child was sleeping',
          }),
        })
      )
    })
  })

  describe('deleteAdministration', () => {
    it('returns error when not authenticated', async () => {
      mockedAuth.mockResolvedValue(null)

      const result = await deleteAdministration('admin-1')

      expect(result).toEqual({ success: false, error: 'Not authenticated' })
    })

    it('returns error when record not found', async () => {
      mockedAuth.mockResolvedValue({ user: { id: 'user-1' } })
      mockedPrisma.medicationAdministration.findUnique.mockResolvedValue(null)

      const result = await deleteAdministration('admin-1')

      expect(result).toEqual({ success: false, error: 'Record not found' })
    })

    it('returns error when record already deleted', async () => {
      mockedAuth.mockResolvedValue({ user: { id: 'user-1' } })
      mockedPrisma.medicationAdministration.findUnique.mockResolvedValue({
        id: 'admin-1',
        deletedAt: new Date(),
      })

      const result = await deleteAdministration('admin-1')

      expect(result).toEqual({ success: false, error: 'Record not found' })
    })

    it('returns error when record is older than 1 hour', async () => {
      mockedAuth.mockResolvedValue({ user: { id: 'user-1' } })
      const twoHoursAgo = new Date()
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)

      mockedPrisma.medicationAdministration.findUnique.mockResolvedValue({
        id: 'admin-1',
        caseId: 'case-1',
        createdAt: twoHoursAgo,
        deletedAt: null,
      })
      mockedPrisma.membership.findFirst.mockResolvedValue({
        memberType: 'PARENT',
        familyRole: 'OWNER_ADMIN',
      })

      const result = await deleteAdministration('admin-1')

      expect(result).toEqual({
        success: false,
        error: 'Can only delete records within 1 hour of creation',
      })
    })

    it('deletes record successfully within 1 hour', async () => {
      mockedAuth.mockResolvedValue({ user: { id: 'user-1' } })
      const fiveMinutesAgo = new Date()
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5)

      mockedPrisma.medicationAdministration.findUnique.mockResolvedValue({
        id: 'admin-1',
        caseId: 'case-1',
        createdAt: fiveMinutesAgo,
        deletedAt: null,
      })
      mockedPrisma.membership.findFirst.mockResolvedValue({
        memberType: 'PARENT',
        familyRole: 'OWNER_ADMIN',
      })
      mockedPrisma.medicationAdministration.update.mockResolvedValue({})

      const result = await deleteAdministration('admin-1')

      expect(result).toEqual({ success: true })
      expect(mockedPrisma.medicationAdministration.update).toHaveBeenCalledWith({
        where: { id: 'admin-1' },
        data: { deletedAt: expect.any(Date) },
      })
    })
  })
})
