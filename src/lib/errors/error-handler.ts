/**
 * Centralized Error Handling
 *
 * Custom error classes, retry logic, and error handling utilities
 */

import { toast } from 'sonner'

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown,
    public userMessage?: string
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.userMessage || this.message
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    // Network errors and 5xx errors are retryable
    return this.statusCode >= 500 && this.statusCode < 600
  }
}

/**
 * Network/API error
 */
export class NetworkError extends AppError {
  constructor(message: string, statusCode: number = 503, details?: unknown) {
    super(
      message,
      'NETWORK_ERROR',
      statusCode,
      details,
      'Netzwerkfehler. Bitte versuchen Sie es erneut.'
    )
    this.name = 'NetworkError'
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      details,
      'Ungültige Eingabe. Bitte überprüfen Sie Ihre Daten.'
    )
    this.name = 'ValidationError'
  }
}

/**
 * Authentication error
 */
export class AuthError extends AppError {
  constructor(message: string, details?: unknown) {
    super(
      message,
      'AUTH_ERROR',
      401,
      details,
      'Sie sind nicht angemeldet. Bitte melden Sie sich an.'
    )
    this.name = 'AuthError'
  }
}

/**
 * Authorization error
 */
export class ForbiddenError extends AppError {
  constructor(message: string, details?: unknown) {
    super(
      message,
      'FORBIDDEN_ERROR',
      403,
      details,
      'Sie haben keine Berechtigung für diese Aktion.'
    )
    this.name = 'ForbiddenError'
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, details?: unknown) {
    super(
      `${resource} not found`,
      'NOT_FOUND_ERROR',
      404,
      details,
      `${resource} wurde nicht gefunden.`
    )
    this.name = 'NotFoundError'
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(retryAfter?: number, details?: Record<string, unknown>) {
    super(
      'Rate limit exceeded',
      'RATE_LIMIT_ERROR',
      429,
      { retryAfter, ...details },
      `Zu viele Anfragen. Bitte warten Sie ${retryAfter ? `${retryAfter} Sekunden` : 'einen Moment'}.`
    )
    this.name = 'RateLimitError'
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super(
      message,
      'DATABASE_ERROR',
      500,
      details,
      'Datenbankfehler. Bitte versuchen Sie es später erneut.'
    )
    this.name = 'DatabaseError'
  }
}

/**
 * External API error
 */
export class ExternalAPIError extends AppError {
  constructor(service: string, message: string, statusCode: number = 503, details?: Record<string, unknown>) {
    super(
      `${service} API error: ${message}`,
      'EXTERNAL_API_ERROR',
      statusCode,
      { service, ...details },
      `Externer Dienst (${service}) ist vorübergehend nicht verfügbar.`
    )
    this.name = 'ExternalAPIError'
  }
}

/**
 * Parse error from unknown type
 */
export function parseError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error
  }

  // Standard Error
  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', 500, { originalError: error })
  }

  // Fetch Response error
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const response = error as Response
    return new NetworkError(
      `HTTP ${response.status}: ${response.statusText}`,
      response.status
    )
  }

  // String error
  if (typeof error === 'string') {
    return new AppError(error, 'UNKNOWN_ERROR', 500)
  }

  // Unknown error type
  return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR', 500, { error })
}

/**
 * Handle error and show toast
 */
export function handleError(error: unknown, context?: string): void {
  const appError = parseError(error)

  // Log to console
  console.error(`[${appError.code}]${context ? ` ${context}:` : ''}`, appError.message, appError.details)

  // Show toast to user
  toast.error(appError.getUserMessage(), {
    description: context,
    duration: 5000,
  })
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry options
 */
export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  shouldRetry?: (error: AppError, attempt: number) => boolean
  onRetry?: (error: AppError, attempt: number) => void
}

const defaultRetryOptions: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  shouldRetry: (error) => error.isRetryable(),
  onRetry: (error, attempt) => {
    console.log(`[RETRY] Attempt ${attempt} after error:`, error.code)
  },
}

/**
 * Execute function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultRetryOptions, ...options }
  let lastError: AppError | null = null

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = parseError(error)

      // Don't retry if this is the last attempt
      if (attempt === opts.maxRetries - 1) {
        break
      }

      // Check if we should retry this error
      if (!opts.shouldRetry(lastError, attempt + 1)) {
        throw lastError
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      )

      // Call retry callback
      opts.onRetry(lastError, attempt + 1)

      // Wait before retrying
      await sleep(delay)
    }
  }

  // All retries exhausted
  throw lastError || new AppError('All retries exhausted', 'RETRY_EXHAUSTED', 500)
}

/**
 * Fetch with automatic retry and error handling
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, init)

    if (!response.ok) {
      // Parse error from response
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      let errorDetails: Record<string, unknown> = { url, status: response.status }

      try {
        const data = await response.json()
        if (data.error) {
          errorMessage = data.error
        }
        if (data.message) {
          errorMessage = data.message
        }
        errorDetails = { ...errorDetails, ...data }
      } catch {
        // Response not JSON, use status text
      }

      // Throw appropriate error type
      if (response.status === 401) {
        throw new AuthError(errorMessage, errorDetails)
      } else if (response.status === 403) {
        throw new ForbiddenError(errorMessage, errorDetails)
      } else if (response.status === 404) {
        throw new NotFoundError(url, errorDetails)
      } else if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        throw new RateLimitError(retryAfter ? parseInt(retryAfter, 10) : undefined, errorDetails)
      } else if (response.status >= 400 && response.status < 500) {
        throw new ValidationError(errorMessage, errorDetails)
      } else {
        throw new NetworkError(errorMessage, response.status, errorDetails)
      }
    }

    return response
  }, retryOptions)
}

/**
 * Safe async operation with error handling and toast
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  options: {
    errorMessage?: string
    successMessage?: string
    retryOptions?: RetryOptions
  } = {}
): Promise<T | null> {
  try {
    const result = options.retryOptions
      ? await withRetry(fn, options.retryOptions)
      : await fn()

    if (options.successMessage) {
      toast.success(options.successMessage)
    }

    return result
  } catch (error) {
    handleError(error, options.errorMessage)
    return null
  }
}
