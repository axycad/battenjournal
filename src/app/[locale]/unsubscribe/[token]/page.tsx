import {Link} from '@/navigation'
import { unsubscribeByToken } from '@/lib/api/notifications'

interface UnsubscribePageProps {
  params: Promise<{ token: string }>
}

export default async function UnsubscribePage({ params }: UnsubscribePageProps) {
  const { token } = await params

  // During build, API calls will fail - return a loading shell
  let result = { success: false, error: 'Loading...' }

  try {
    result = await unsubscribeByToken(token)
  } catch (error) {
    // During build, return a minimal shell
    if (process.env.CAPACITOR_BUILD === 'true' || token === '_placeholder_') {
      return (
        <div className="min-h-screen flex items-center justify-center p-md">
          <div className="max-w-md w-full text-center">
            <div className="animate-pulse">Loading...</div>
          </div>
        </div>
      )
    }
    // At runtime, show error
    result = { success: false, error: 'Failed to process unsubscribe request' }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-md">
      <div className="max-w-md w-full text-center">
        {result.success ? (
          <>
            <div className="w-16 h-16 mx-auto mb-md bg-semantic-success/10 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-semantic-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 className="text-h2 font-bold text-text-primary mb-sm">Unsubscribed</h1>
            <p className="text-body text-text-secondary mb-lg">
              You've been unsubscribed from email notifications. You can change this anytime in your settings.
            </p>

            <div className="space-y-sm">
              <Link
                href="/settings/notifications"
                className="block text-purple-600 hover:text-purple-700 hover:underline font-medium"
              >
                Manage email preferences
              </Link>
              <Link
                href="/dashboard"
                className="block text-purple-600 hover:text-purple-700 hover:underline"
              >
                Go to dashboard
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-md bg-semantic-critical/10 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-semantic-critical"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>

            <h1 className="text-h2 font-bold text-text-primary mb-sm">Invalid link</h1>
            <p className="text-body text-text-secondary mb-lg">
              This unsubscribe link is invalid or has expired.
            </p>

            <Link
              href="/login"
              className="text-purple-600 hover:text-purple-700 hover:underline font-medium"
            >
              Log in to manage your preferences
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

// For Capacitor static export - generate a placeholder
// The actual token will be determined client-side from the URL
export const dynamicParams = true
export async function generateStaticParams() {
  // Return a placeholder path
  return [{ token: '_placeholder_' }]
}
