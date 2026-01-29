import ResetPasswordClient from './reset-password-client'

export default async function ResetPasswordPage() {
  return <ResetPasswordClient />
}

// For Capacitor static export - generate a placeholder
// The actual token will be determined client-side from the URL
export const dynamicParams = true
export async function generateStaticParams() {
  // Return a placeholder path
  return [{ token: '_placeholder_' }]
}
