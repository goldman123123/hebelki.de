import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rateLimit } from '../rate-limit'

// The rate limiter uses a module-level shared Map, so we use unique
// token names per test to avoid cross-test pollution.
let testCounter = 0
function uniqueToken(prefix = 'user') {
  return `${prefix}-${++testCounter}-${Date.now()}`
}

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests within the limit', async () => {
    const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 100 })
    const token = uniqueToken()

    // 3 requests with limit of 5 should all pass
    await expect(limiter.check(token, 5)).resolves.toBeUndefined()
    await expect(limiter.check(token, 5)).resolves.toBeUndefined()
    await expect(limiter.check(token, 5)).resolves.toBeUndefined()
  })

  it('blocks requests over the limit', async () => {
    const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 100 })
    const token = uniqueToken()

    // Use up all 3 requests
    await limiter.check(token, 3)
    await limiter.check(token, 3)
    await limiter.check(token, 3)

    // 4th request should be blocked
    await expect(limiter.check(token, 3)).rejects.toThrow('Rate limit exceeded')
  })

  it('resets after the interval expires', async () => {
    const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 100 })
    const token = uniqueToken()

    // Use up all requests
    await limiter.check(token, 1)
    await expect(limiter.check(token, 1)).rejects.toThrow('Rate limit exceeded')

    // Advance time past the interval
    vi.advanceTimersByTime(61_000)

    // Should work again after window reset
    await expect(limiter.check(token, 1)).resolves.toBeUndefined()
  })

  it('tracks tokens independently', async () => {
    const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 100 })
    const token1 = uniqueToken('a')
    const token2 = uniqueToken('b')

    // Use up limit for token1
    await limiter.check(token1, 1)
    await expect(limiter.check(token1, 1)).rejects.toThrow('Rate limit exceeded')

    // token2 should still work
    await expect(limiter.check(token2, 1)).resolves.toBeUndefined()
  })

  it('reports remaining requests correctly', async () => {
    const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 100 })
    const token = uniqueToken()

    expect(limiter.remaining(token, 5)).toBe(5) // Fresh token

    await limiter.check(token, 5)
    expect(limiter.remaining(token, 5)).toBe(4)

    await limiter.check(token, 5)
    expect(limiter.remaining(token, 5)).toBe(3)
  })

  it('returns full remaining after window expires', async () => {
    const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 100 })
    const token = uniqueToken()

    await limiter.check(token, 5)
    await limiter.check(token, 5)
    expect(limiter.remaining(token, 5)).toBe(3)

    vi.advanceTimersByTime(61_000)

    expect(limiter.remaining(token, 5)).toBe(5)
  })

  it('reset() clears a specific token', async () => {
    const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 100 })
    const token = uniqueToken()

    await limiter.check(token, 1)
    await expect(limiter.check(token, 1)).rejects.toThrow('Rate limit exceeded')

    limiter.reset(token)

    // Should work after manual reset
    await expect(limiter.check(token, 1)).resolves.toBeUndefined()
  })

  it('includes retry time in error message', async () => {
    const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 100 })
    const token = uniqueToken()

    await limiter.check(token, 1)

    try {
      await limiter.check(token, 1)
      expect.unreachable('should have thrown')
    } catch (err) {
      expect((err as Error).message).toMatch(/Try again in \d+ seconds/)
    }
  })
})
