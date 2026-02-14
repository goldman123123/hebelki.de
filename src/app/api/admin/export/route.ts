/**
 * GET /api/admin/export
 *
 * Auth-protected endpoint. Exports all business data as JSON.
 * Business owners/admins can download their full dataset.
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, dbRetry } from '@/lib/db'
import {
  businesses,
  businessMembers,
  services,
  staff,
  staffServices,
  customers,
  bookings,
  chatbotConversations,
  chatbotMessages,
  chatbotKnowledge,
  invoices,
  availabilityTemplates,
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:admin:export')

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get business + verify membership
    const [member] = await dbRetry(() =>
      db
        .select({
          business: businesses,
          role: businessMembers.role,
        })
        .from(businessMembers)
        .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
        .where(and(
          eq(businessMembers.clerkUserId, userId),
          eq(businessMembers.status, 'active')
        ))
        .limit(1)
    )

    if (!member) {
      return NextResponse.json({ error: 'Kein Unternehmen gefunden' }, { status: 404 })
    }

    const biz = member.business
    const businessId = biz.id

    // Fetch all business data in parallel
    const [
      allServices,
      allStaff,
      allStaffServices,
      allCustomers,
      allBookings,
      allConversations,
      allKnowledge,
      allInvoices,
      allTemplates,
    ] = await Promise.all([
      db.select().from(services).where(eq(services.businessId, businessId)),
      db.select().from(staff).where(eq(staff.businessId, businessId)),
      db.select().from(staffServices).innerJoin(staff, eq(staffServices.staffId, staff.id)).where(eq(staff.businessId, businessId)),
      db.select().from(customers).where(eq(customers.businessId, businessId)),
      db.select().from(bookings).where(eq(bookings.businessId, businessId)),
      db.select().from(chatbotConversations).where(eq(chatbotConversations.businessId, businessId)),
      db.select().from(chatbotKnowledge).where(eq(chatbotKnowledge.businessId, businessId)),
      db.select().from(invoices).where(eq(invoices.businessId, businessId)),
      db.select().from(availabilityTemplates).where(eq(availabilityTemplates.businessId, businessId)),
    ])

    // Fetch messages for all conversations
    const conversationIds = allConversations.map(c => c.id)
    const allMessages = conversationIds.length > 0
      ? await Promise.all(
          conversationIds.map(convId =>
            db.select().from(chatbotMessages).where(eq(chatbotMessages.conversationId, convId))
          )
        )
      : []

    // Build conversations with messages
    const conversationsWithMessages = allConversations.map((conv, i) => ({
      ...conv,
      messages: allMessages[i] || [],
    }))

    const exportData = {
      exportDate: new Date().toISOString(),
      business: {
        name: biz.name,
        slug: biz.slug,
        type: biz.type,
        tagline: biz.tagline,
        description: biz.description,
        email: biz.email,
        phone: biz.phone,
        address: biz.address,
        website: biz.website,
        timezone: biz.timezone,
        currency: biz.currency,
        legalName: biz.legalName,
        legalForm: biz.legalForm,
        registrationNumber: biz.registrationNumber,
        settings: biz.settings,
        planId: biz.planId,
        createdAt: biz.createdAt,
      },
      services: allServices.map(s => ({
        name: s.name,
        description: s.description,
        durationMinutes: s.durationMinutes,
        price: s.price,
        isActive: s.isActive,
        createdAt: s.createdAt,
      })),
      staff: allStaff.map(s => ({
        name: s.name,
        email: s.email,
        phone: s.phone,
        title: s.title,
        isActive: s.isActive,
        createdAt: s.createdAt,
      })),
      staffServices: allStaffServices.map(ss => ({
        staffId: ss.staff_services.staffId,
        serviceId: ss.staff_services.serviceId,
      })),
      customers: allCustomers.map(c => ({
        name: c.name,
        email: c.email,
        phone: c.phone,
        source: c.source,
        createdAt: c.createdAt,
      })),
      bookings: allBookings.map(b => ({
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        status: b.status,
        price: b.price,
        notes: b.notes,
        source: b.source,
        createdAt: b.createdAt,
      })),
      conversations: conversationsWithMessages.map(c => ({
        channel: c.channel,
        status: c.status,
        createdAt: c.createdAt,
        messages: c.messages.map(m => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
      })),
      knowledgeBase: allKnowledge.map(k => ({
        title: k.title,
        content: k.content,
        category: k.category,
        source: k.source,
        isActive: k.isActive,
        createdAt: k.createdAt,
      })),
      invoices: allInvoices.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        subtotal: inv.subtotal,
        total: inv.total,
        status: inv.status,
        issueDate: inv.issueDate,
        items: inv.items,
        createdAt: inv.createdAt,
      })),
      availabilityTemplates: allTemplates.map(t => ({
        name: t.name,
        isDefault: t.isDefault,
        createdAt: t.createdAt,
      })),
    }

    const filename = `hebelki-export-${biz.slug}-${new Date().toISOString().split('T')[0]}.json`

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    log.error('[GET /api/admin/export] Error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Exportieren der Daten.' },
      { status: 500 }
    )
  }
}
