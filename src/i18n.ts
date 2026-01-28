import { getRequestConfig } from 'next-intl/server'
import { routing } from './i18n/routing'

export const locales = routing.locales
export const defaultLocale = routing.defaultLocale

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locale ?? defaultLocale
  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  }
})
