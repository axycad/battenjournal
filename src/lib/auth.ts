import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import type { Adapter } from 'next-auth/adapters'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { loginSchema } from './validations'

const nextAuthConfig = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) {
          return null
        }

        const { email, password } = parsed.data

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        })

        if (!user || !user.passwordHash) {
          return null
        }

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) {
          return null
        }

        // Log the login
        await prisma.auditEntry.create({
          data: {
            actorUserId: user.id,
            action: 'LOGIN',
            objectType: 'User',
            objectId: user.id,
          },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
})

export const { handlers, signIn, signOut } = nextAuthConfig

// Wrapped auth function that handles Capacitor build time
export async function auth() {
  // During Capacitor build, return null to avoid calling headers()
  if (process.env.CAPACITOR_BUILD === 'true') {
    return null
  }

  try {
    return await nextAuthConfig.auth()
  } catch (error) {
    // Gracefully handle auth failures during build
    console.warn('Auth call failed during build:', error)
    return null
  }
}
