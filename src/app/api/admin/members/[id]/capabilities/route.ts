/**
 * Staff Capabilities API
 *
 * GET  /api/admin/members/[id]/capabilities - Get staff member's tool capabilities
 * PATCH /api/admin/members/[id]/capabilities - Update tool capabilities
 *
 * [id] = staff table ID (team members from Team & Planung)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { getStaffById } from '@/lib/db/queries'
import { requirePermission } from '@/modules/core/permissions'
import { getMembership } from '@/modules/core/auth'
import { db } from '@/lib/db'
import { staff } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:admin:members:id:capabilities')

// All available tools that can be assigned
const ALL_ASSIGNABLE_TOOLS = [
  // Bookings
  'search_bookings', 'update_booking_status', 'reschedule_booking',
  'get_todays_bookings', 'get_upcoming_bookings', 'create_booking_admin',
  'cancel_booking_with_notification',
  // Customers
  'create_customer', 'update_customer', 'search_customers',
  'get_customer_bookings', 'delete_customer',
  // Communication
  'send_email_to_customer', 'resend_booking_confirmation', 'send_whatsapp',
  // Services
  'create_service', 'update_service', 'delete_service',
  // Staff
  'create_staff', 'update_staff', 'delete_staff',
  'assign_staff_to_service', 'remove_staff_from_service',
  // Availability
  'get_availability_template', 'update_availability_template',
  'block_day', 'block_staff_period',
  // Invoices
  'search_invoices', 'get_invoice_details', 'create_invoice',
  'send_invoice', 'mark_invoice_paid', 'cancel_invoice_storno',
  // Knowledge
  'add_knowledge_entry', 'update_knowledge_entry', 'delete_knowledge_entry',
  // Overview
  'get_daily_summary', 'get_monthly_schedule', 'get_escalated_conversations',
  'search_customer_conversations',
  // Other
  'update_booking', 'get_affected_bookings', 'update_business_profile',
  'update_booking_rules', 'update_staff_service_priority',
  'classify_uploaded_document', 'send_email_with_attachments',
  'create_replacement_invoice', 'generate_lieferschein',
  'update_booking_items', 'get_download_link', 'get_booking_documents',
]

// Role default tool lists
export const ROLE_DEFAULTS: Record<string, string[]> = {
  staff: [
    'search_bookings', 'update_booking_status', 'reschedule_booking',
    'get_todays_bookings', 'get_upcoming_bookings', 'create_booking_admin',
    'cancel_booking_with_notification',
    'create_customer', 'update_customer', 'search_customers', 'get_customer_bookings',
    'send_email_to_customer', 'resend_booking_confirmation',
  ],
  admin: ALL_ASSIGNABLE_TOOLS,
  owner: ALL_ASSIGNABLE_TOOLS,
}

const capabilitiesSchema = z.object({
  allowedTools: z.array(z.string()).nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const currentMember = await getMembership(authResult.userId, authResult.business.id)
  if (!currentMember) {
    return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
  }

  try {
    requirePermission(currentMember, 'members:read')

    const staffMember = await getStaffById(id, authResult.business.id)
    if (!staffMember) {
      return NextResponse.json({ error: 'Mitarbeiter nicht gefunden' }, { status: 404 })
    }

    const capabilities = staffMember.capabilities as { allowedTools?: string[] } | null
    // Staff members default to 'staff' role capabilities
    const roleDefaults = ROLE_DEFAULTS.staff

    return NextResponse.json({
      staffId: id,
      name: staffMember.name,
      role: 'staff',
      capabilities: capabilities,
      roleDefaults,
      allAssignableTools: ALL_ASSIGNABLE_TOOLS,
      isCustom: capabilities?.allowedTools != null,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    log.error('Error fetching capabilities:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const currentMember = await getMembership(authResult.userId, authResult.business.id)
  if (!currentMember) {
    return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
  }

  try {
    requirePermission(currentMember, 'members:update')

    const staffMember = await getStaffById(id, authResult.business.id)
    if (!staffMember) {
      return NextResponse.json({ error: 'Mitarbeiter nicht gefunden' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = capabilitiesSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { allowedTools } = parsed.data

    // null = reset to role defaults, array = custom capabilities
    const newCapabilities = allowedTools === null
      ? null
      : { allowedTools: allowedTools.filter(t => ALL_ASSIGNABLE_TOOLS.includes(t)) }

    await db
      .update(staff)
      .set({ capabilities: newCapabilities })
      .where(and(eq(staff.id, id), eq(staff.businessId, authResult.business.id)))

    return NextResponse.json({
      success: true,
      capabilities: newCapabilities,
      isCustom: newCapabilities !== null,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'ForbiddenError') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    log.error('Error updating capabilities:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
