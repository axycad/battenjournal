import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const createCaseSchema = z.object({
  childDisplayName: z
    .string()
    .min(1, 'Child name is required')
    .max(100),
  diseaseProfileVersion: z.string().default('CLN2'),
})

export const inviteSchema = z.object({
  caseId: z.string().min(1),
  email: z.string().email('Invalid email address'),
  familyRole: z.enum(['OWNER_ADMIN', 'EDITOR', 'VIEWER']).default('EDITOR'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateCaseInput = z.infer<typeof createCaseSchema>
export type InviteInput = z.infer<typeof inviteSchema>
