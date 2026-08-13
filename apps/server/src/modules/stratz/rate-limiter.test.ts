import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RateLimiter } from './rate-limiter'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('RateLimiter', () => {
  it('allows requests under the limits immediately', async () => {
    const limiter = new RateLimiter({ perSecond: 5, perMinute: 100, perHour: 1000, perDay: 10000 })
    await limiter.acquire()
    await limiter.acquire()
    expect(limiter.windowCounts.second).toBe(2)
  })

  it('waits when the per-second limit is reached', async () => {
    const limiter = new RateLimiter({ perSecond: 2, perMinute: 100, perHour: 1000, perDay: 10000 })
    await limiter.acquire()
    await limiter.acquire()

    const blocked = limiter.acquire()
    let resolved = false
    void blocked.then(() => {
      resolved = true
    })
    await vi.advanceTimersByTimeAsync(999)
    expect(resolved).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await blocked
    expect(resolved).toBe(true)

    // The old timestamps slid out of the window; a new request passes immediately
    const again = limiter.acquire()
    let againResolved = false
    void again.then(() => {
      againResolved = true
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(againResolved).toBe(true)
    await again
  })

  it('enforces the per-minute limit across a burst', async () => {
    const limiter = new RateLimiter({ perSecond: 100, perMinute: 3, perHour: 1000, perDay: 10000 })
    for (let i = 0; i < 3; i++) {
      await limiter.acquire()
    }
    const blocked = limiter.acquire()
    let resolved = false
    void blocked.then(() => {
      resolved = true
    })
    await vi.advanceTimersByTimeAsync(59_999)
    expect(resolved).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await blocked
    expect(resolved).toBe(true)
  })

  it('frees the window once old timestamps expire', async () => {
    const limiter = new RateLimiter({ perSecond: 1, perMinute: 100, perHour: 1000, perDay: 10000 })
    await limiter.acquire()
    const blocked = limiter.acquire()
    let resolved = false
    void blocked.then(() => {
      resolved = true
    })
    await vi.advanceTimersByTimeAsync(1000)
    await blocked
    expect(resolved).toBe(true)
  })

  it('reports window counts', () => {
    const limiter = new RateLimiter({ perSecond: 5, perMinute: 100, perHour: 1000, perDay: 10000 })
    expect(limiter.windowCounts).toEqual({ second: 0, minute: 0, hour: 0, day: 0 })
  })
})
