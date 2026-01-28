import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getLocale } from 'next-intl/server'
import { Providers } from '@/components/providers'
import { AppHeader } from '@/components/layouts/app-header'
import { OfflineBanner } from '@/components/offline-banner'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const locale = await getLocale()

  if (!session) {
    redirect(`/${locale}/login`)
  }

  return (
    <Providers>
      <div className="min-h-screen flex flex-col">
        <AppHeader user={session.user} />
        <OfflineBanner />
        <main className="flex-1">{children}</main>
      </div>
    </Providers>
  )
}
