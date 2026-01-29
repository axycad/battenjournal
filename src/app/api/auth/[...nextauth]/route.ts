import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers

// For Capacitor static export, skip this dynamic route
export async function generateStaticParams() {
  return []
}
