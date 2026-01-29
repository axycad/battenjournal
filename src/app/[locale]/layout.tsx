import type { Metadata, Viewport } from 'next'
import '../globals.css'
import { Providers } from '../providers'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export const metadata: Metadata = {
  title: 'Batten Journal',
  description: 'Parent-first care logging for Batten disease',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Batten Journal',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#9333EA', // purple-600
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messages = await getMessages({ locale })
  const isRtl = false // Arabic removed

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'}>
      <head>
        <meta charSet="utf-8" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen bg-bg-primary antialiased">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
