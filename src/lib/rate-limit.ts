/**
 * Simple in-memory rate limiter
 * For production, use Redis or a dedicated rate limiting service
 */

interface RateLimitConfig {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max number of unique tokens to track
}

interface TokenBucket {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, TokenBucket>()

/**
 * Create a rate limiter
 */
export function rateLimit(config: RateLimitConfig) {
  const { interval, uniqueTokenPerInterval } = config

  return {
    /**
     * Check if a token has exceeded the rate limit
     * @param token Unique identifier (e.g., userId, IP address)
     * @param limit Maximum number of requests allowed in the interval
     * @throws Error if rate limit exceeded
     */
    async check(token: string, limit: number): Promise<void> {
      const now = Date.now()
      const bucket = rateLimitMap.get(token)

      if (!bucket || now > bucket.resetAt) {
        // Create new bucket or reset expired one
        rateLimitMap.set(token, {
          count: 1,
          resetAt: now + interval,
        })
        return
      }

      // Check if limit exceeded
      if (bucket.count >= limit) {
        const resetIn = Math.ceil((bucket.resetAt - now) / 1000)
        throw new Error(`Rate limit exceeded. Try again in ${resetIn} seconds.`)
      }

      // Increment counter
      bucket.count++

      // Clean up old entries if map gets too large
      if (rateLimitMap.size > uniqueTokenPerInterval) {
        this.cleanup()
      }
    },

    /**
     * Clean up expired entries
     */
    cleanup(): void {
      const now = Date.now()
      for (const [token, bucket] of rateLimitMap.entries()) {
        if (now > bucket.resetAt) {
          rateLimitMap.delete(token)
        }
      }
    },

    /**
     * Get remaining requests for a token
     */
    remaining(token: string, limit: number): number {
      const bucket = rateLimitMap.get(token)
      if (!bucket || Date.now() > bucket.resetAt) {
        return limit
      }
      return Math.max(0, limit - bucket.count)
    },

    /**
     * Reset a specific token
     */
    reset(token: string): void {
      rateLimitMap.delete(token)
    },
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */

// Scraping operations: 10 requests per hour per user
export const scrapingLimiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
})

// API calls: 100 requests per minute per user
export const apiLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
})

// Authentication: 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 500,
})

// Chatbot messages: 10 messages per minute per IP
// Prevents abuse and DoS attacks on public chat endpoint
export const chatbotLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 2000,
})

// Booking creation: 5 bookings per minute per IP
export const bookingLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
})

// Chatbot polling: 30 requests per minute per conversationId
export const pollLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 2000,
})

// Chatbot escalation: 5 escalations per minute per conversationId
export const escalationLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
})
