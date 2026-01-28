import { createNavigation } from 'next-intl/navigation'
import { locales } from './i18n'

export const { Link, usePathname, useRouter } = createNavigation({
  locales,
  localePrefix: 'never',
})
