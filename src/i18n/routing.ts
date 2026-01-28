import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'es', 'pl', 'ro', 'fr', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'never',

  // Disable locale detection from browser Accept-Language header
  // This ensures the cookie takes priority
  localeDetection: true,

  // Configure the locale cookie with a long expiration
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365 // 1 year in seconds
  }
})
