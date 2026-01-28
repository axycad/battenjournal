'use server'

import { cookies } from 'next/headers'
import { routing } from '@/i18n/routing'

export async function setLocale(locale: string) {
  // Validate locale
  if (!routing.locales.includes(locale as any)) {
    return { success: false, error: 'Invalid locale' }
  }

  // Set the cookie on the server side
  const cookieStore = await cookies()
  cookieStore.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })

  return { success: true }
}
