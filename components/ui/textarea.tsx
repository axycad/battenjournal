import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || props.name

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
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-sm py-3 bg-white border border-divider rounded-sm',
            'text-body text-text-primary',
            'placeholder:text-text-secondary',
            'focus:outline-none focus:ring-2 focus:ring-accent-focus focus:border-accent-primary',
            'resize-none',
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

Textarea.displayName = 'Textarea'

export { Textarea }
