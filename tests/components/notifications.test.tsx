import { render, screen } from '@testing-library/react'
import { NotificationBadge } from '@/components/notifications/badge'

describe('NotificationBadge', () => {
  it('renders nothing when count is 0', () => {
    const { container } = render(<NotificationBadge count={0} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders count when greater than 0', () => {
    render(<NotificationBadge count={5} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders 99+ for counts over 99', () => {
    render(<NotificationBadge count={150} />)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('renders exactly 99 without plus', () => {
    render(<NotificationBadge count={99} />)
    expect(screen.getByText('99')).toBeInTheDocument()
  })

  it('applies default variant styling', () => {
    render(<NotificationBadge count={1} />)
    const badge = screen.getByText('1')
    expect(badge).toHaveClass('bg-accent-primary')
  })

  it('applies critical variant styling', () => {
    render(<NotificationBadge count={1} variant="critical" />)
    const badge = screen.getByText('1')
    expect(badge).toHaveClass('bg-semantic-critical')
  })

  it('applies warning variant styling', () => {
    render(<NotificationBadge count={1} variant="warning" />)
    const badge = screen.getByText('1')
    expect(badge).toHaveClass('bg-semantic-warning')
  })

  it('applies small size by default', () => {
    render(<NotificationBadge count={1} />)
    const badge = screen.getByText('1')
    expect(badge).toHaveClass('h-[18px]')
  })

  it('applies medium size when specified', () => {
    render(<NotificationBadge count={1} size="md" />)
    const badge = screen.getByText('1')
    expect(badge).toHaveClass('h-[22px]')
  })

  it('applies custom className', () => {
    render(<NotificationBadge count={1} className="custom-class" />)
    const badge = screen.getByText('1')
    expect(badge).toHaveClass('custom-class')
  })
})
