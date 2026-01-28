import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getLocale } from 'next-intl/server'

export default async function Home() {
  const session = await auth()
  const locale = await getLocale()

  if (session) {
    redirect(`/${locale}/dashboard`)
  } else {
    redirect(`/${locale}/login`)
  }
}
