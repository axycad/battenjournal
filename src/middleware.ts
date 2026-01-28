import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

export default function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Check if pathname starts with a locale prefix
  const matchedLocale = routing.locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  )

  // Redirect locale-prefixed URLs to non-prefixed versions
  if (matchedLocale) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(`/${matchedLocale}`, '') || '/'
    const response = NextResponse.redirect(url)
    // Set the cookie to persist the locale choice with SameSite
    response.cookies.set('NEXT_LOCALE', matchedLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    })
    return response
  }

  // Check for locale parameter (fallback for mobile)
  const localeParam = searchParams.get('locale')
  if (localeParam && routing.locales.includes(localeParam as any)) {
    const response = intlMiddleware(request)
    // Set cookie from URL parameter
    response.cookies.set('NEXT_LOCALE', localeParam, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
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
