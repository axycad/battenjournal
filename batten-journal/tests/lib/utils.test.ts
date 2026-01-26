import { cn, formatDate, formatTime, formatDateTime } from '@/lib/utils'

describe('cn (className merge)', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', true && 'included', false && 'excluded')).toBe('base included')
  })

  it('handles undefined and null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end')
  })

  it('merges Tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
  })

  it('handles objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })
})

describe('formatDate', () => {
  it('formats Date object', () => {
    const date = new Date('2024-03-15T10:30:00Z')
    const result = formatDate(date)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/Mar/)
    expect(result).toMatch(/2024/)
  })

  it('formats date string', () => {
    const result = formatDate('2024-12-25T00:00:00Z')
    expect(result).toMatch(/25/)
    expect(result).toMatch(/Dec/)
    expect(result).toMatch(/2024/)
  })

  it('handles different months', () => {
    expect(formatDate(new Date('2024-01-01'))).toMatch(/Jan/)
    expect(formatDate(new Date('2024-06-15'))).toMatch(/Jun/)
    expect(formatDate(new Date('2024-11-30'))).toMatch(/Nov/)
  })
})

describe('formatTime', () => {
  it('formats time in 24-hour format', () => {
    const date = new Date('2024-03-15T14:30:00')
    const result = formatTime(date)
    expect(result).toMatch(/14:30/)
  })

  it('formats morning time', () => {
    const date = new Date('2024-03-15T09:05:00')
    const result = formatTime(date)
    expect(result).toMatch(/09:05/)
  })

  it('handles midnight', () => {
    const date = new Date('2024-03-15T00:00:00')
    const result = formatTime(date)
    expect(result).toMatch(/00:00/)
  })

  it('formats time string input', () => {
    const result = formatTime('2024-03-15T18:45:00')
    expect(result).toMatch(/18:45/)
  })
})

describe('formatDateTime', () => {
  it('combines date and time', () => {
    const date = new Date('2024-03-15T14:30:00')
    const result = formatDateTime(date)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/Mar/)
    expect(result).toMatch(/2024/)
    expect(result).toMatch(/14:30/)
  })

  it('handles string input', () => {
    const result = formatDateTime('2024-12-25T09:00:00')
    expect(result).toMatch(/25/)
    expect(result).toMatch(/Dec/)
    expect(result).toMatch(/09:00/)
  })
})
