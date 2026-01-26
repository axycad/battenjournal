import Link from 'next/link'
import { unsubscribeByToken } from '@/actions/email-notifications'

interface UnsubscribePageProps {
  params: Promise<{ token: string }>
}

export default async function UnsubscribePage({ params }: UnsubscribePageProps) {
  const { token } = await params

  const result = await unsubscribeByToken(token)

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

            <h1 className="screen-title mb-sm">Unsubscribed</h1>
            <p className="text-body text-text-secondary mb-lg">
              You've been unsubscribed from email notifications. You can change this anytime in your settings.
            </p>

            <div className="space-y-sm">
              <Link
                href="/settings/notifications"
                className="block text-accent-primary hover:underline"
              >
                Manage email preferences
              </Link>
              <Link
                href="/dashboard"
                className="block text-text-secondary hover:text-text-primary"
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

            <h1 className="screen-title mb-sm">Invalid link</h1>
            <p className="text-body text-text-secondary mb-lg">
              This unsubscribe link is invalid or has expired.
            </p>

            <Link
              href="/login"
              className="text-accent-primary hover:underline"
            >
              Log in to manage your preferences
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
