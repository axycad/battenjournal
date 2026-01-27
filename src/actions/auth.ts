'use server'

import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { addHours } from 'date-fns'
import { prisma } from '@/lib/prisma'
import {
  passwordResetRequestSchema,
  passwordResetSchema,
  registerSchema,
  type PasswordResetInput,
  type PasswordResetRequestInput,
  type RegisterInput,
} from '@/lib/validations'
import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'
import { sendEmail } from '@/lib/email'

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

const PASSWORD_RESET_TTL_HOURS = 1

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function getBaseUrl() {
  return process.env.AUTH_URL || 'http://localhost:5000'
}

export async function requestPasswordReset(
  input: PasswordResetRequestInput
): Promise<ActionResult> {
  const parsed = passwordResetRequestSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const normalizedEmail = parsed.data.email.toLowerCase()
  const user = await prisma.user.findFirst({
    where: { email: normalizedEmail, deletedAt: null },
    select: { id: true, email: true, name: true },
  })

  if (!user) {
    return { success: true }
  }

  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = addHours(new Date(), PASSWORD_RESET_TTL_HOURS)

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    })
    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    })
  })

  const resetUrl = `${getBaseUrl()}/reset-password/${token}`
  const subject = 'Reset your Batten Journal password'
  const greeting = user.name ? `Hi ${user.name},` : 'Hi there,'
  const html = `
    <p>${greeting}</p>
    <p>We received a request to reset your password.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>This link expires in ${PASSWORD_RESET_TTL_HOURS} hour${
    PASSWORD_RESET_TTL_HOURS === 1 ? '' : 's'
  }.</p>
    <p>If you did not request a reset, you can safely ignore this email.</p>
  `
  const text = `${greeting}
We received a request to reset your password.
Reset your password: ${resetUrl}
This link expires in ${PASSWORD_RESET_TTL_HOURS} hour${
    PASSWORD_RESET_TTL_HOURS === 1 ? '' : 's'
  }.
If you did not request a reset, you can safely ignore this email.`

  try {
    await sendEmail({
      to: user.email,
      subject,
      html,
      text,
    })
  } catch (error) {
    console.error('[auth] Failed to send password reset email', error)
    return {
      success: false,
      error: 'Password reset email service is not configured',
    }
  }

  return { success: true }
}

export async function resetPassword(
  input: PasswordResetInput
): Promise<ActionResult> {
  const parsed = passwordResetSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const now = new Date()
  const tokenHash = hashToken(parsed.data.token)
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  })

  if (!record || record.usedAt || record.expiresAt < now) {
    return { success: false, error: 'This reset link is invalid or expired' }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    })
    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    })
    await tx.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null },
    })
    await tx.session.deleteMany({ where: { userId: record.userId } })
    await tx.auditEntry.create({
      data: {
        actorUserId: record.userId,
        action: 'EDIT',
        objectType: 'User',
        objectId: record.userId,
        metadata: { action: 'password_reset' },
      },
    })
  })

  return { success: true }
}
