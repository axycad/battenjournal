interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
}

/**
 * LoadingSpinner - Mobile-optimized loading indicator
 *
 * Features:
 * - Multiple sizes for different contexts
 * - Optional loading text
 * - Full-screen mode for page-level loading
 * - Accessible with ARIA labels
 */
export function LoadingSpinner({
  size = 'md',
  text,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  }

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-sm">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-accent-primary border-t-transparent`}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p className="text-meta text-text-secondary">{text}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg-primary">
        {spinner}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center p-md">
      {spinner}
    </div>
  )
}

/**
 * PageLoadingSpinner - Full-screen loading for page transitions
 */
export function PageLoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return <LoadingSpinner size="lg" text={text} fullScreen />
}

/**
 * InlineLoadingSpinner - Small inline loading indicator
 */
export function InlineLoadingSpinner() {
  return <LoadingSpinner size="sm" />
}
