import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { locales, defaultLocale } from './i18n'

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'never',
})

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const matchedLocale = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  )

  if (matchedLocale) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(`/${matchedLocale}`, '') || '/'
    const response = NextResponse.redirect(url)
    response.cookies.set('NEXT_LOCALE', matchedLocale)
    return response
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: [
    // Match all paths except API routes, Next.js internals, and static files
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
}
