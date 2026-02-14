/**
 * GET /api/gdpr/export?token=xxx
 *
 * Public endpoint. Generates JSON export of all customer data
 * (customer info, bookings, conversations, invoices) before deletion.
 * Token-gated.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  customers,
  bookings,
  chatbotConversations,
  chatbotMessages,
  invoices,
  deletionRequests,
  services,
  staff,
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:gdpr:export')

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token ist erforderlich' },
        { status: 400 }
      )
    }

    // Find the deletion request
    const [deletionRequest] = await db
      .select()
      .from(deletionRequests)
      .where(eq(deletionRequests.token, token))
      .limit(1)

    if (!deletionRequest) {
      return NextResponse.json(
        { error: 'Ungültiger oder abgelaufener Link' },
        { status: 404 }
      )
    }

    // Check if already completed (data already deleted)
    if (deletionRequest.status === 'completed') {
      return NextResponse.json(
        { error: 'Ihre Daten wurden bereits gelöscht und können nicht mehr exportiert werden.' },
        { status: 410 }
      )
    }

    // Check if expired
    if (new Date() > deletionRequest.expiresAt) {
      return NextResponse.json(
        { error: 'Dieser Link ist abgelaufen.' },
        { status: 410 }
      )
    }

    const customerId = deletionRequest.customerId
    const businessId = deletionRequest.businessId

    if (!customerId) {
      return NextResponse.json(
        { error: 'Kundendaten wurden bereits gelöscht und können nicht mehr exportiert werden.' },
        { status: 410 }
      )
    }

    // Fetch customer data
    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.businessId, businessId)
        )
      )
      .limit(1)

    if (!customer) {
      return NextResponse.json(
        { error: 'Kundendaten nicht gefunden' },
        { status: 404 }
      )
    }

    // Fetch bookings with service and staff names
    const customerBookings = await db
      .select({
        id: bookings.id,
        startsAt: bookings.startsAt,
        endsAt: bookings.endsAt,
        status: bookings.status,
        price: bookings.price,
        notes: bookings.notes,
        source: bookings.source,
        createdAt: bookings.createdAt,
        serviceName: services.name,
        staffName: staff.name,
      })
      .from(bookings)
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(staff, eq(bookings.staffId, staff.id))
      .where(eq(bookings.customerId, customerId))

    // Fetch conversations with messages
    const conversations = await db
      .select({
        id: chatbotConversations.id,
        channel: chatbotConversations.channel,
        status: chatbotConversations.status,
        createdAt: chatbotConversations.createdAt,
        closedAt: chatbotConversations.closedAt,
      })
      .from(chatbotConversations)
      .where(eq(chatbotConversations.customerId, customerId))

    // Fetch messages for all conversations
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await db
          .select({
            role: chatbotMessages.role,
            content: chatbotMessages.content,
            createdAt: chatbotMessages.createdAt,
          })
          .from(chatbotMessages)
          .where(eq(chatbotMessages.conversationId, conv.id))

        return { ...conv, messages }
      })
    )

    // Fetch invoices
    const customerInvoices = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        subtotal: invoices.subtotal,
        taxRate: invoices.taxRate,
        taxAmount: invoices.taxAmount,
        total: invoices.total,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        items: invoices.items,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .where(eq(invoices.customerId, customerId))

    // Build export
    const exportData = {
      exportDate: new Date().toISOString(),
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        street: customer.street,
        city: customer.city,
        postalCode: customer.postalCode,
        country: customer.country,
        source: customer.source,
        createdAt: customer.createdAt,
      },
      bookings: customerBookings.map((b) => ({
        id: b.id,
        service: b.serviceName,
        staff: b.staffName,
        startsAt: b.startsAt?.toISOString(),
        endsAt: b.endsAt?.toISOString(),
        status: b.status,
        price: b.price,
        notes: b.notes,
        source: b.source,
        createdAt: b.createdAt?.toISOString(),
      })),
      conversations: conversationsWithMessages.map((c) => ({
        id: c.id,
        channel: c.channel,
        status: c.status,
        createdAt: c.createdAt?.toISOString(),
        closedAt: c.closedAt?.toISOString(),
        messages: c.messages.map((m) => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt?.toISOString(),
        })),
      })),
      invoices: customerInvoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        subtotal: inv.subtotal,
        taxRate: inv.taxRate,
        taxAmount: inv.taxAmount,
        total: inv.total,
        status: inv.status,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        items: inv.items,
        createdAt: inv.createdAt?.toISOString(),
      })),
    }

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="meine-daten-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    log.error('[GET /api/gdpr/export] Error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten beim Exportieren Ihrer Daten.' },
      { status: 500 }
    )
  }
}
