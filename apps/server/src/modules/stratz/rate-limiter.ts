export interface RateLimitConfig {
  perSecond: number
  perMinute: number
  perHour: number
  perDay: number
}

const DAY_MS = 24 * 60 * 60 * 1000

export class RateLimiter {
  private timestamps: number[] = []

  constructor(private readonly limits: RateLimitConfig) {}

  get windowCounts() {
    const now = Date.now()
    return {
      second: this.countWithin(now, 1000),
      minute: this.countWithin(now, 60_000),
      hour: this.countWithin(now, 3_600_000),
      day: this.timestamps.length,
    }
  }

  private countWithin(now: number, windowMs: number): number {
    return this.timestamps.filter((t) => now - t < windowMs).length
  }

  async acquire(): Promise<void> {
    for (;;) {
      const now = Date.now()
      this.timestamps = this.timestamps.filter((t) => now - t < DAY_MS)
      if (this.timestamps.length === 0) {
        this.timestamps.push(now)
        return
      }

      const violations: Array<{ windowMs: number }> = []
      if (this.countWithin(now, 1000) >= this.limits.perSecond) violations.push({ windowMs: 1000 })
      if (this.countWithin(now, 60_000) >= this.limits.perMinute)
        violations.push({ windowMs: 60_000 })
      if (this.countWithin(now, 3_600_000) >= this.limits.perHour)
        violations.push({ windowMs: 3_600_000 })
      if (this.timestamps.length >= this.limits.perDay) violations.push({ windowMs: DAY_MS })

      if (violations.length === 0) {
        this.timestamps.push(now)
        return
      }

      const waits = violations.map(({ windowMs }) => {
        const oldestInWindow = this.timestamps.find((t) => now - t < windowMs) ?? now
        return oldestInWindow + windowMs - now
      })
      await sleep(Math.max(50, Math.min(...waits)))
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
