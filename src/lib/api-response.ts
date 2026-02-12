import { NextResponse } from 'next/server'

/**
 * Standardized error response helper (H5)
 */
export function errorResponse(
  message: string,
  status: number,
  extra?: Record<string, unknown>
) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

/**
 * Safe JSON body parser — returns 400 on malformed input (H7)
 */
export async function parseBody<T = unknown>(
  request: Request
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const data = (await request.json()) as T
    return { data }
  } catch {
    return { error: errorResponse('Invalid or missing JSON body', 400) }
  }
}
