import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const headersList = await headers()

  const nextLocaleCookie = cookieStore.get('NEXT_LOCALE')
  const acceptLanguage = headersList.get('accept-language')

  return NextResponse.json({
    cookies: {
      NEXT_LOCALE: nextLocaleCookie?.value || 'not set',
      all: Array.from(cookieStore.getAll()).map(c => ({ name: c.name, value: c.value }))
    },
    headers: {
      acceptLanguage: acceptLanguage || 'not set'
    },
    requestUrl: request.url,
  })
}
