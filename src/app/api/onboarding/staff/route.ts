import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { staff, availabilityTemplates, availabilitySlots } from '@/lib/db/schema'
import { requireBusinessAccess } from '@/lib/auth-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:onboarding:staff')

interface TimeSlot {
  startTime: string
  endTime: string
}

interface WeeklySchedule {
  [dayOfWeek: number]: TimeSlot[]
}

interface StaffMemberInput {
  tempId: string
  name: string
  email?: string
  phone?: string
  title?: string
  availability: WeeklySchedule
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { businessId, staffMembers } = body

    if (!businessId || !Array.isArray(staffMembers)) {
      return NextResponse.json(
        { error: 'Missing businessId or staffMembers' },
        { status: 400 }
      )
    }

    // Verify user has access to business
    log.info(`Verifying access for user ${userId} to business ${businessId}`)
    try {
      await requireBusinessAccess(businessId)
      log.info(`Access verified successfully`)
    } catch (accessError) {
      log.error(`Access verification failed:`, accessError)
      throw accessError
    }

    // Create staff members and their availability templates in transaction
    const createdStaff = await db.transaction(async (tx) => {
      const results = []

      for (const member of staffMembers as StaffMemberInput[]) {
        // Create staff member
        const [newStaff] = await tx
          .insert(staff)
          .values({
            businessId,
            name: member.name,
            email: member.email || null,
            phone: member.phone || null,
            title: member.title || null,
            isActive: true,
          })
          .returning()

        // Create availability template if schedule provided
        if (member.availability && Object.keys(member.availability).length > 0) {
          const [template] = await tx
            .insert(availabilityTemplates)
            .values({
              businessId,
              staffId: newStaff.id,
              name: `${member.name}'s Default Hours`,
              isDefault: true,
            })
            .returning()

          // Create availability slots
          const slots = Object.entries(member.availability).flatMap(
            ([dayOfWeek, timeSlots]) =>
              (timeSlots as TimeSlot[]).map((slot) => ({
                templateId: template.id,
                dayOfWeek: parseInt(dayOfWeek),
                startTime: slot.startTime,
                endTime: slot.endTime,
              }))
          )

          if (slots.length > 0) {
            await tx.insert(availabilitySlots).values(slots)
          }
        }

        results.push({
          id: newStaff.id,
          tempId: member.tempId,
          name: newStaff.name,
          email: newStaff.email,
          phone: newStaff.phone,
          title: newStaff.title,
          availability: member.availability,
        })
      }

      return results
    })

    return NextResponse.json({
      success: true,
      staff: createdStaff,
      message: `${createdStaff.length} staff member(s) created`,
    })
  } catch (error) {
    log.error('Error creating staff:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create staff members' },
      { status: 500 }
    )
  }
}
