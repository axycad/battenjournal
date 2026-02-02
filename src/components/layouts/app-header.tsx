'use client'

import { useMemo } from 'react'
import { signOut } from 'next-auth/react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui'
import { Link, usePathname, useRouter } from '@/navigation'
import { routing } from '@/i18n/routing'

interface AppHeaderProps {
  user: {
    name?: string | null
    email?: string | null
  }
}

export function AppHeader({ user }: AppHeaderProps) {
  const t = useTranslations('appHeader')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  const languageOptions = useMemo(
    () => [
      { value: 'en', label: 'English' },
      { value: 'es', label: 'Spanish' },
      { value: 'pl', label: 'Polish' },
      { value: 'ro', label: 'Romanian' },
      { value: 'fr', label: 'French' },
    ],
    []
  )

  async function handleLocaleChange(nextLocale: string) {
    if (!routing.locales.includes(nextLocale as (typeof routing.locales)[number])) {
      return
    }

    try {
      // Set cookie on client side
      document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`

      // Navigate with locale parameter for mobile browsers
      // The middleware will pick this up and set the cookie
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.set('locale', nextLocale)

      // Navigate to the URL with locale parameter
      window.location.href = currentUrl.toString()
    } catch (error) {
      console.error('Failed to change locale:', error)
      // Simple fallback
      window.location.reload()
    }
  }

  return (
    <header className="border-b border-purple-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-md py-sm flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-sm hover:opacity-80 transition-opacity">
          <div className="relative w-8 h-8">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9333ea" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="6" fill="url(#logoGradient)" />
              <path
                d="M9 13.5C9 11.567 10.567 10 12.5 10h7c1.933 0 3.5 1.567 3.5 3.5v0c0 1.38-.8 2.64-2.05 3.22L19 17.5v2.5c0 1.105-.895 2-2 2h-2c-1.105 0-2-.895-2-2v-2.5l-1.95-.78C9.8 16.14 9 14.88 9 13.5z"
                fill="white"
                opacity="0.95"
              />
              <circle cx="13.5" cy="13.5" r="1.5" fill="url(#logoGradient)" />
              <circle cx="18.5" cy="13.5" r="1.5" fill="url(#logoGradient)" />
            </svg>
          </div>
          <span className="text-title-md font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {t('appName')}
          </span>
        </Link>

        <div className="flex items-center gap-md">
          <label className="text-meta">
            <span className="sr-only">{t('language')}</span>
            <select
              value={locale}
              onChange={(event) => handleLocaleChange(event.target.value)}
              className="text-meta text-text-secondary bg-white border border-purple-200 rounded-md px-sm py-1 hover:border-purple-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              aria-label={t('language')}
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <span className="text-meta text-text-secondary hidden sm:inline">
            {user.name || user.email}
          </span>
          <Link
            href="/settings"
            className="text-meta text-purple-600 hover:text-purple-700 font-medium"
          >
            {t('settings')}
          </Link>
          <Button
            variant="text"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="h-auto px-0 text-meta text-text-secondary hover:text-purple-700"
          >
            {t('signOut')}
          </Button>
        </div>
      </div>
    </header>
  )
}
