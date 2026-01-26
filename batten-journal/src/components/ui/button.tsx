import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text' | 'destructive'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', loading, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center h-button px-sm rounded-md font-medium transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-accent-focus focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-accent-primary text-white hover:opacity-90',
      secondary:
        'border border-accent-primary text-accent-primary hover:bg-accent-primary/10',
      text: 'text-accent-primary hover:underline',
      destructive:
        'border border-divider text-text-primary hover:border-semantic-critical hover:text-semantic-critical',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="mr-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
