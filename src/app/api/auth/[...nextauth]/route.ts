import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers

// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic'

// For Capacitor static export, skip this dynamic route
export async function generateStaticParams() {
  return []
}
