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
      { value: 'ar', label: 'Arabic' },
    ],
    []
  )

  async function handleLocaleChange(nextLocale: string) {
    if (!routing.locales.includes(nextLocale as (typeof routing.locales)[number])) {
      return
    }

    try {
      // Use server action to set cookie reliably
      const result = await setLocale(nextLocale)

      if (result.success) {
        // Force a full page reload to pick up the new locale
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to change locale:', error)
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
