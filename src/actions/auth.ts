'use server'

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { registerSchema, type RegisterInput } from '@/lib/validations'
import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'

export type ActionResult = {
  success: boolean
  error?: string
}

export async function register(input: RegisterInput): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { name, email, password } = parsed.data
  const normalizedEmail = email.toLowerCase()

  // Check if user exists
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (existing) {
    return { success: false, error: 'An account with this email already exists' }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12)

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role: 'PARENT',
    },
  })

  // Log registration
  await prisma.auditEntry.create({
    data: {
      actorUserId: user.id,
      action: 'EDIT',
      objectType: 'User',
      objectId: user.id,
      metadata: { action: 'register' },
    },
  })

  return { success: true }
}

export async function login(
  email: string,
  password: string
): Promise<ActionResult> {
  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Invalid email or password' }
    }
    throw error
  }
}
