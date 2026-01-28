import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'es', 'pl', 'ro', 'fr', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'never',

  // Configure the locale cookie with a long expiration
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365 // 1 year in seconds
  }
})
