'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import {
  SEVERITY_LEVELS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  type SeverityLevel,
} from '@/lib/event-types'

export interface SeveritySliderProps {
  value?: SeverityLevel
  onChange?: (value: SeverityLevel) => void
  className?: string
  disabled?: boolean
  label?: string
  required?: boolean
}

const SeveritySlider = forwardRef<HTMLDivElement, SeveritySliderProps>(
  ({ value, onChange, className, disabled, label = 'Severity', required }, ref) => {
    const levels = [
      SEVERITY_LEVELS.MINIMAL,
      SEVERITY_LEVELS.MILD,
      SEVERITY_LEVELS.MODERATE,
      SEVERITY_LEVELS.SEVERE,
    ] as const

    return (
      <div ref={ref} className={cn('w-full', className)}>
        <label className="block text-body font-medium text-text-primary mb-xs">
          {label}
          {required && <span className="text-semantic-critical ml-1">*</span>}
        </label>
        <div
          role="group"
          aria-label={label}
          className="grid grid-cols-4 gap-xs"
        >
          {levels.map((level) => {
            const isSelected = value === level
            const levelLabel = SEVERITY_LABELS[level]
            const baseColorClasses = SEVERITY_COLORS[level]

            return (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={levelLabel}
                disabled={disabled}
                onClick={() => onChange?.(level)}
                className={cn(
                  // Base styles
                  'relative flex flex-col items-center justify-center',
                  'min-h-[48px] px-xs py-xs',
                  'rounded-md border-2 transition-all duration-fast',
                  'focus:outline-none focus:ring-2 focus:ring-accent-focus focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  // Color styles
                  baseColorClasses,
                  // Selected state
                  isSelected
                    ? 'border-text-primary ring-2 ring-accent-primary ring-offset-2'
                    : 'border-transparent',
                  // Hover state (only when not disabled)
                  !disabled && 'hover:border-text-secondary cursor-pointer'
                )}
              >
                {/* Numeric indicator */}
                <span className="text-title-md font-bold leading-none mb-1">
                  {level}
                </span>
                {/* Label */}
                <span className="text-caption font-medium leading-none">
                  {levelLabel}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }
)

SeveritySlider.displayName = 'SeveritySlider'

export { SeveritySlider }
