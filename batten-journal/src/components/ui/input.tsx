import { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || props.name || generatedId

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-meta text-text-secondary mb-xs"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-sm py-3 bg-white border border-divider rounded-sm',
            'text-body text-text-primary',
            'placeholder:text-text-secondary',
            'focus:outline-none focus:ring-2 focus:ring-accent-focus focus:border-accent-primary',
            error && 'border-semantic-critical',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-xs text-caption text-semantic-critical">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
