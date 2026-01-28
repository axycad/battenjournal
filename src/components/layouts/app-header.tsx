'use client'

import { useMemo } from 'react'
import { signOut } from 'next-auth/react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui'
import { Link, usePathname, useRouter } from '@/navigation'
import { routing } from '@/i18n/routing'
import { setLocale } from '@/app/actions/locale'

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
      // Set cookie on both client and server for maximum reliability
      document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`

      // Use server action to set cookie server-side
      await setLocale(nextLocale)

      // Navigate with locale parameter as fallback for mobile browsers
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
    <header className="border-b border-divider bg-white">
      <div className="max-w-3xl mx-auto px-md py-sm flex items-center justify-between">
        <Link href="/dashboard" className="text-title-md font-medium text-text-primary">
          {t('appName')}
        </Link>

        <div className="flex items-center gap-sm">
          <label className="text-meta text-text-secondary">
            <span className="sr-only">{t('language')}</span>
            <select
              value={locale}
              onChange={(event) => handleLocaleChange(event.target.value)}
              className="text-meta text-text-secondary bg-white border border-divider rounded-sm px-xs py-1"
              aria-label={t('language')}
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <span className="text-meta text-text-secondary">
            {user.name || user.email}
          </span>
          <Link
            href="/settings/sync"
            className="text-meta text-text-secondary hover:text-text-primary"
          >
            {t('settings')}
          </Link>
          <Button
            variant="text"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="h-auto px-0"
          >
            {t('signOut')}
          </Button>
        </div>
      </div>
    </header>
  )
}
