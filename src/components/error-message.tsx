'use client'

import { useButtonClick } from '@/lib/hooks/use-mobile-interaction'

interface ErrorMessageProps {
  title?: string
  message: string
  onRetry?: () => void
  fullScreen?: boolean
}

/**
 * ErrorMessage - Mobile-optimized error display
 *
 * Features:
 * - Clear error messaging
 * - Optional retry action with haptic feedback
 * - Full-screen mode for page-level errors
 * - Accessible design
 */
export function ErrorMessage({
  title = 'Something went wrong',
  message,
  onRetry,
  fullScreen = false,
}: ErrorMessageProps) {
  const handleRetry = useButtonClick(() => {
    if (onRetry) {
      onRetry()
    }
  })

  const content = (
    <div className="flex flex-col items-center justify-center gap-md text-center p-md">
      {/* Error icon */}
      <div className="w-12 h-12 rounded-full bg-semantic-critical/10 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-semantic-critical"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      {/* Error text */}
      <div className="max-w-md">
        <h3 className="text-title-md font-medium text-text-primary mb-xs">
          {title}
        </h3>
        <p className="text-body text-text-secondary">
          {message}
        </p>
      </div>

      {/* Retry button */}
      {onRetry && (
        <button
          onClick={handleRetry}
          className="btn-primary mt-sm"
          type="button"
        >
          Try again
        </button>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg-primary">
        {content}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[300px]">
      {content}
    </div>
  )
}

/**
 * PageErrorMessage - Full-screen error for page-level failures
 */
export function PageErrorMessage({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return <ErrorMessage message={message} onRetry={onRetry} fullScreen />
}

/**
 * InlineErrorMessage - Compact error for inline display
 */
export function InlineErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-xs p-sm bg-semantic-critical/10 border border-semantic-critical/20 rounded-sm">
      <svg
        className="w-5 h-5 text-semantic-critical flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-meta text-semantic-critical">{message}</p>
    </div>
  )
}
