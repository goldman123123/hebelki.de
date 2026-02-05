import { NextResponse } from 'next/server'

/**
 * GET /api/chatbot/date - Get current server date/time
 *
 * Provides reliable date information for the AI chatbot
 * to use when checking availability and calculating dates.
 */
export async function GET() {
  const now = new Date()

  // Calculate tomorrow
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Calculate next 7 days
  const next7Days = []
  for (let i = 1; i <= 7; i++) {
    const futureDate = new Date(now)
    futureDate.setDate(futureDate.getDate() + i)
    next7Days.push(futureDate.toISOString().split('T')[0])
  }

  return NextResponse.json({
    success: true,
    data: {
      // Current date/time
      currentDateTime: now.toISOString(),
      currentDate: now.toISOString().split('T')[0], // YYYY-MM-DD
      currentTime: now.toTimeString().split(' ')[0], // HH:MM:SS

      // Tomorrow
      tomorrow: tomorrow.toISOString().split('T')[0],

      // Next 7 days (for "next available" searches)
      next7Days,

      // Day of week info
      dayOfWeek: now.getDay(), // 0=Sunday, 6=Saturday
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],

      // Timezone
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  })
}
