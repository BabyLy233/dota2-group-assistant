import { describe, expect, it } from 'vitest'
import { formatDateTime, formatDuration, formatNumber } from './format'

describe('formatDuration', () => {
  it('formats seconds as m:ss', () => {
    expect(formatDuration(2252)).toBe('37m32s')
    expect(formatDuration(60)).toBe('1m00s')
    expect(formatDuration(5)).toBe('0m05s')
  })

  it('handles null', () => {
    expect(formatDuration(null)).toBe('-')
  })
})

describe('formatNumber', () => {
  it('adds thousands separators', () => {
    expect(formatNumber(12345)).toBe('12,345')
    expect(formatNumber(0)).toBe('0')
  })

  it('handles null', () => {
    expect(formatNumber(null)).toBe('-')
  })
})

describe('formatDateTime', () => {
  it("formats unix seconds without 'Invalid Date'", () => {
    const out = formatDateTime(1786547304)
    expect(out).not.toContain('Invalid')
    expect(out.length).toBeGreaterThan(0)
  })

  it('handles null', () => {
    expect(formatDateTime(null)).toBe('-')
  })
})
