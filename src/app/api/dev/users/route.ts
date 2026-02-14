/**
 * Dev Users API
 *
 * GET /api/dev/users
 *
 * Returns all business members for development user switching.
 * Only works in development mode.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { businessMembers } from '@/lib/db/schema'
import { clerkClient } from '@clerk/nextjs/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:dev:users')

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }

  try {
    // Get all business members
    const members = await db
      .select({
        clerkUserId: businessMembers.clerkUserId,
        role: businessMembers.role,
        status: businessMembers.status,
      })
      .from(businessMembers)

    // Fetch Clerk user data for each member
    const client = await clerkClient()
    const usersWithDetails = await Promise.all(
      members.map(async (member) => {
        try {
          const clerkUser = await client.users.getUser(member.clerkUserId)

          return {
            clerkUserId: member.clerkUserId,
            role: member.role,
            status: member.status,
            email: clerkUser.emailAddresses[0]?.emailAddress,
            name: clerkUser.fullName || clerkUser.firstName || 'Unknown',
          }
        } catch (error) {
          log.error(`Failed to fetch Clerk user ${member.clerkUserId}:`, error)
          return {
            clerkUserId: member.clerkUserId,
            role: member.role,
            status: member.status,
            email: undefined,
            name: 'Unknown User',
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      users: usersWithDetails,
    })
  } catch (error) {
    log.error('Error fetching users:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch users',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
