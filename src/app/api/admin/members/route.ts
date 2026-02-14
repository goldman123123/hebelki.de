/**
 * Team Members API
 *
 * GET /api/admin/members - List all members for the business
 * POST /api/admin/members - Invite a new member
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { getBusinessMembers, createBusinessMember } from '@/lib/db/queries'
import { requirePermission } from '@/modules/core/permissions'
import { requireSeatsAvailable } from '@/modules/core/entitlements'
import { getMembership } from '@/modules/core/auth'
import { emitEventStandalone } from '@/modules/core/events'
import { clerkClient } from '@clerk/nextjs/server'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:admin:members')

const inviteMemberSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  role: z.enum(['owner', 'admin', 'staff'], {
    message: 'Rolle muss owner, admin oder staff sein'
  }),
})

export async function GET(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  // Get current user's membership to check permissions
  const member = await getMembership(authResult.userId, authResult.business.id)

  if (!member) {
    return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
  }

  try {
    // Check permission
    requirePermission(member, 'members:read')

    // Get all members
    const members = await getBusinessMembers(authResult.business.id)

    // Resolve Clerk user names
    const client = await clerkClient()
    const enrichedMembers = await Promise.all(
      members.map(async (m) => {
        try {
          if (m.clerkUserId.startsWith('pending:')) {
            return { ...m, name: m.clerkUserId.replace('pending:', ''), email: m.clerkUserId.replace('pending:', '') }
          }
          const clerkUser = await client.users.getUser(m.clerkUserId)
          return {
            ...m,
            name: clerkUser.fullName || clerkUser.firstName || 'Unbekannt',
            email: clerkUser.emailAddresses[0]?.emailAddress || null,
          }
        } catch {
          return { ...m, name: 'Unbekannt', email: null }
        }
      })
    )

    return NextResponse.json({ members: enrichedMembers })
  } catch (error) {
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    log.error('Error fetching members:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  // Get current user's membership to check permissions
  const member = await getMembership(authResult.userId, authResult.business.id)

  if (!member) {
    return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
  }

  try {
    // Check permission
    requirePermission(member, 'members:invite')

    // Check seat limits
    await requireSeatsAvailable(authResult.business)

    // Parse and validate request body
    const body = await request.json()
    const parsed = inviteMemberSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email, role } = parsed.data

    // Look up Clerk user by email to get clerkUserId
    const client = await clerkClient()
    let clerkUserId = `pending:${email}`
    let inviteeName: string | undefined

    try {
      const userList = await client.users.getUserList({ emailAddress: [email] })
      if (userList.data.length > 0) {
        const foundUser = userList.data[0]
        clerkUserId = foundUser.id
        inviteeName = foundUser.fullName || foundUser.firstName || undefined
      }
    } catch {
      // User not found in Clerk - will use pending placeholder
    }

    // Create member invitation
    const newMember = await createBusinessMember({
      businessId: authResult.business.id,
      clerkUserId,
      role,
      status: 'invited',
      invitedBy: member.id,
    })

    // Get inviter name from Clerk
    let inviterName = 'Team'
    try {
      const inviterUser = await client.users.getUser(authResult.userId)
      inviterName = inviterUser.fullName || inviterUser.firstName || 'Team'
    } catch {
      // Fallback to generic name
    }

    // Emit member.invited event (send invitation email)
    await emitEventStandalone(authResult.business.id, 'member.invited', {
      memberId: newMember.id,
      businessId: authResult.business.id,
      businessName: authResult.business.name,
      inviteeEmail: email,
      inviteeName,
      inviterName,
      role,
      invitationUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.hebelki.de'}/accept-invitation/${newMember.id}`,
    })

    return NextResponse.json({ member: newMember }, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'ForbiddenError') {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      if (error.name === 'SeatLimitError') {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
    }

    log.error('Error inviting member:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
