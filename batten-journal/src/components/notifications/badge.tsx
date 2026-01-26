'use client'

interface NotificationBadgeProps {
  count: number
  variant?: 'default' | 'critical' | 'warning'
  size?: 'sm' | 'md'
  className?: string
}

export function NotificationBadge({
  count,
  variant = 'default',
  size = 'sm',
  className = '',
}: NotificationBadgeProps) {
  if (count === 0) return null

  const displayCount = count > 99 ? '99+' : count.toString()

  const variantClasses = {
    default: 'bg-accent-primary text-white',
    critical: 'bg-semantic-critical text-white',
    warning: 'bg-semantic-warning text-white',
  }

  const sizeClasses = {
    sm: 'min-w-[18px] h-[18px] text-[11px] px-1',
    md: 'min-w-[22px] h-[22px] text-caption px-1.5',
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {displayCount}
    </span>
  )
}
