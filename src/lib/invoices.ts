/**
 * Invoice Generation Library
 *
 * Handles German-compliant invoice creation following § 14 UStG requirements.
 * Generates PDFs using Puppeteer and stores them in Cloudflare R2.
 *
 * Implements invoice immutability: once sent, invoices cannot be modified.
 * Supports Stornorechnung (credit notes) for cancellation workflow.
 */

import { db } from './db'
import {
  invoices,
  invoiceSequences,
  businesses,
  customers,
  bookings,
  services,
  documentEvents,
  type InvoiceLineItem,
  type BusinessTaxSettings,
} from './db/schema'
import { eq, and, ne, sql, desc } from 'drizzle-orm'
import { generateInvoiceHtml } from './invoice-templates'
import { generatePdfFromHtml } from './pdf'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

// R2 client configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = (process.env.R2_BUCKET_NAME || 'hebelki').trim()

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
})

// ============================================
// IMMUTABILITY GUARD
// ============================================

/**
 * Assert that an invoice is in draft status and can be modified.
 * Throws if the invoice has been sent, paid, or cancelled.
 */
export function assertInvoiceMutable(invoice: { status: string; invoiceNumber: string }) {
  if (invoice.status !== 'draft') {
    throw new Error(
      `Rechnung ${invoice.invoiceNumber} kann nicht bearbeitet werden (Status: ${invoice.status}). ` +
      `Nur Entwürfe können geändert werden.`
    )
  }
}

// ============================================
// AUDIT TRAIL
// ============================================

/**
 * Log a document event to the audit trail
 */
export async function logDocumentEvent(params: {
  businessId: string
  invoiceId?: string
  bookingId?: string
  documentType: string
  action: string
  actorType?: string
  actorId?: string
  metadata?: Record<string, unknown>
}) {
  await db.insert(documentEvents).values({
    businessId: params.businessId,
    invoiceId: params.invoiceId,
    bookingId: params.bookingId,
    documentType: params.documentType,
    action: params.action,
    actorType: params.actorType || 'staff',
    actorId: params.actorId,
    metadata: params.metadata || {},
  })
}

// ============================================
// INVOICE NUMBER GENERATION
// ============================================

/**
 * Generate the next invoice number for a business
 * Format: RE-{year}-{sequence} (e.g., RE-2026-00001)
 * Stornorechnungen use the same sequence as regular invoices.
 */
export async function generateNextInvoiceNumber(businessId: string): Promise<string> {
  const year = new Date().getFullYear()

  const result = await db.execute(sql`
    INSERT INTO invoice_sequences (id, business_id, year, last_number, created_at, updated_at)
    VALUES (gen_random_uuid(), ${businessId}, ${year}, 1, now(), now())
    ON CONFLICT (business_id, year)
    DO UPDATE SET
      last_number = invoice_sequences.last_number + 1,
      updated_at = now()
    RETURNING last_number
  `)

  const nextNumber = result.rows[0].last_number as number
  return `RE-${year}-${String(nextNumber).padStart(5, '0')}`
}

// ============================================
// TAX HELPERS
// ============================================

export function getBusinessTaxSettings(business: typeof businesses.$inferSelect): BusinessTaxSettings {
  const settings = business.settings as Record<string, unknown> | null
  return {
    taxId: settings?.taxId as string | undefined,
    taxRate: settings?.taxRate as number | undefined ?? 19,
    isKleinunternehmer: settings?.isKleinunternehmer as boolean | undefined ?? false,
    showLogoOnInvoice: settings?.showLogoOnInvoice as boolean | undefined ?? true,
  }
}

export function calculateTaxAmounts(subtotal: number, taxSettings: BusinessTaxSettings): {
  taxRate: number
  taxAmount: number
  total: number
} {
  if (taxSettings.isKleinunternehmer) {
    return { taxRate: 0, taxAmount: 0, total: subtotal }
  }

  const taxRate = taxSettings.taxRate ?? 19
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  return {
    taxRate,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}

// ============================================
// INVOICE CREATION
// ============================================

/**
 * Create an invoice for a booking.
 * Skips cancelled invoices and stornos when checking for existing invoice.
 */
export async function createInvoiceForBooking(bookingId: string): Promise<typeof invoices.$inferSelect> {
  const bookingData = await db
    .select({
      booking: bookings,
      service: services,
      customer: customers,
      business: businesses,
    })
    .from(bookings)
    .innerJoin(businesses, eq(bookings.businessId, businesses.id))
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(customers, eq(bookings.customerId, customers.id))
    .where(eq(bookings.id, bookingId))
    .limit(1)

  if (!bookingData[0]) {
    throw new Error('Booking not found')
  }

  const { booking, service, customer, business } = bookingData[0]

  if (!customer) {
    throw new Error('Customer not found for this booking')
  }

  if (!customer.street || !customer.city || !customer.postalCode) {
    throw new Error('Customer address is incomplete. Please add street, city, and postal code.')
  }

  // Check for active invoice (exclude cancelled and storno invoices)
  const existingInvoice = await db
    .select()
    .from(invoices)
    .where(and(
      eq(invoices.bookingId, bookingId),
      ne(invoices.status, 'cancelled'),
      eq(invoices.type, 'invoice'),
    ))
    .limit(1)

  if (existingInvoice[0]) {
    throw new Error('Invoice already exists for this booking')
  }

  const taxSettings = getBusinessTaxSettings(business)
  const invoiceNumber = await generateNextInvoiceNumber(business.id)

  // Build line items
  const bookingItems = (booking as Record<string, unknown>).items as InvoiceLineItem[] | null
  const unitPrice = booking.price ? parseFloat(booking.price) : (service?.price ? parseFloat(service.price) : 0)
  const serviceItem: InvoiceLineItem = {
    description: service?.name || 'Dienstleistung',
    quantity: 1,
    unitPrice: unitPrice.toFixed(2),
    total: unitPrice.toFixed(2),
  }
  const lineItems: InvoiceLineItem[] = bookingItems && bookingItems.length > 0
    ? [serviceItem, ...bookingItems]
    : [serviceItem]

  const subtotal = lineItems.reduce((sum, item) => sum + parseFloat(item.total), 0)
  const { taxRate, taxAmount, total } = calculateTaxAmounts(subtotal, taxSettings)

  const today = new Date()
  const issueDate = today.toISOString().split('T')[0]
  const serviceDate = booking.startsAt.toISOString().split('T')[0]
  const dueDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [invoice] = await db
    .insert(invoices)
    .values({
      businessId: business.id,
      bookingId: booking.id,
      customerId: customer.id,
      invoiceNumber,
      items: lineItems,
      subtotal: subtotal.toFixed(2),
      taxRate: taxRate.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      currency: business.currency || 'EUR',
      status: 'draft',
      type: 'invoice',
      issueDate,
      serviceDate,
      dueDate,
    })
    .returning()

  await logDocumentEvent({
    businessId: business.id,
    invoiceId: invoice.id,
    bookingId: booking.id,
    documentType: 'invoice',
    action: 'created',
    metadata: { invoiceNumber },
  })

  return invoice
}

// ============================================
// PDF GENERATION
// ============================================

export function generateInvoiceR2Key(businessId: string, invoiceId: string): string {
  return `tenant/${businessId}/invoices/${invoiceId}.pdf`
}

/**
 * Generate invoice PDF and upload to R2.
 * If the invoice is not a draft and already has a PDF, return the existing key.
 */
export async function generateAndUploadInvoicePdf(invoiceId: string): Promise<string> {
  const invoiceData = await db
    .select({
      invoice: invoices,
      business: businesses,
      customer: customers,
      booking: bookings,
      service: services,
    })
    .from(invoices)
    .innerJoin(businesses, eq(invoices.businessId, businesses.id))
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(bookings, eq(invoices.bookingId, bookings.id))
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(invoices.id, invoiceId))
    .limit(1)

  if (!invoiceData[0]) {
    throw new Error('Invoice not found')
  }

  const { invoice, business, customer, booking, service } = invoiceData[0]

  // Immutability: if invoice is not draft and already has a PDF, return existing
  if (invoice.status !== 'draft' && invoice.pdfR2Key) {
    return invoice.pdfR2Key
  }

  if (!customer) {
    throw new Error('Customer not found for this invoice')
  }

  const taxSettings = getBusinessTaxSettings(business)

  // For storno invoices, load original invoice number
  let originalInvoiceNumber: string | undefined
  if (invoice.type === 'storno' && invoice.originalInvoiceId) {
    const [origInv] = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(eq(invoices.id, invoice.originalInvoiceId))
      .limit(1)
    originalInvoiceNumber = origInv?.invoiceNumber
  }

  const html = generateInvoiceHtml({
    invoice,
    business,
    customer,
    taxSettings,
    serviceName: service?.name || 'Dienstleistung',
    serviceDate: invoice.serviceDate || invoice.issueDate,
    showLogo: taxSettings.showLogoOnInvoice !== false,
    invoiceType: invoice.type,
    originalInvoiceNumber,
  })

  const pdfBuffer = await generatePdfFromHtml(html)
  const r2Key = generateInvoiceR2Key(business.id, invoice.id)
  await uploadToR2(r2Key, pdfBuffer)

  await db
    .update(invoices)
    .set({ pdfR2Key: r2Key, updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId))

  return r2Key
}

async function uploadToR2(r2Key: string, pdfBuffer: Buffer): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
  })
  await r2Client.send(command)
}

// ============================================
// INVOICE UPDATE (DRAFT ONLY)
// ============================================

/**
 * Recreate an existing invoice with updated line items from the booking.
 * Only allowed for draft invoices.
 */
export async function updateInvoiceFromBooking(invoiceId: string): Promise<typeof invoices.$inferSelect> {
  const invoiceData = await db
    .select({
      invoice: invoices,
      business: businesses,
      customer: customers,
      booking: bookings,
      service: services,
    })
    .from(invoices)
    .innerJoin(businesses, eq(invoices.businessId, businesses.id))
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(bookings, eq(invoices.bookingId, bookings.id))
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(invoices.id, invoiceId))
    .limit(1)

  if (!invoiceData[0]) {
    throw new Error('Invoice not found')
  }

  const { invoice, business, customer, booking, service } = invoiceData[0]

  // IMMUTABILITY GUARD
  assertInvoiceMutable(invoice)

  if (!booking) {
    throw new Error('No booking linked to this invoice')
  }

  const taxSettings = getBusinessTaxSettings(business)

  const bookingItems = (booking as Record<string, unknown>).items as InvoiceLineItem[] | null
  const unitPrice = booking.price ? parseFloat(booking.price) : (service?.price ? parseFloat(service.price) : 0)
  const serviceItem: InvoiceLineItem = {
    description: service?.name || 'Dienstleistung',
    quantity: 1,
    unitPrice: unitPrice.toFixed(2),
    total: unitPrice.toFixed(2),
  }
  const lineItems: InvoiceLineItem[] = bookingItems && bookingItems.length > 0
    ? [serviceItem, ...bookingItems]
    : [serviceItem]

  const subtotal = lineItems.reduce((sum, item) => sum + parseFloat(item.total), 0)
  const { taxRate, taxAmount, total } = calculateTaxAmounts(subtotal, taxSettings)

  const [updated] = await db
    .update(invoices)
    .set({
      items: lineItems,
      subtotal: subtotal.toFixed(2),
      taxRate: taxRate.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      pdfR2Key: null,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId))
    .returning()

  await logDocumentEvent({
    businessId: business.id,
    invoiceId: invoice.id,
    bookingId: booking.id,
    documentType: 'invoice',
    action: 'regenerated',
  })

  return updated
}

// ============================================
// SEND INVOICE
// ============================================

/**
 * Send an invoice to the customer.
 * Sets status to 'sent', records sentAt, ensures PDF exists.
 */
export async function sendInvoice(invoiceId: string, actorId?: string): Promise<typeof invoices.$inferSelect> {
  const invoiceData = await db
    .select({
      invoice: invoices,
      business: businesses,
      customer: customers,
    })
    .from(invoices)
    .innerJoin(businesses, eq(invoices.businessId, businesses.id))
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .where(eq(invoices.id, invoiceId))
    .limit(1)

  if (!invoiceData[0]) {
    throw new Error('Invoice not found')
  }

  const { invoice, business, customer } = invoiceData[0]

  if (invoice.status !== 'draft') {
    throw new Error(`Rechnung ${invoice.invoiceNumber} wurde bereits versendet.`)
  }

  if (!customer?.email) {
    throw new Error('Kunde hat keine E-Mail-Adresse. Bitte zuerst eine E-Mail-Adresse hinzufügen.')
  }

  // Ensure PDF exists
  if (!invoice.pdfR2Key) {
    await generateAndUploadInvoicePdf(invoiceId)
  }

  // Reload to get pdfR2Key
  const [refreshed] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1)

  const [updated] = await db
    .update(invoices)
    .set({
      status: 'sent',
      sentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId))
    .returning()

  await logDocumentEvent({
    businessId: business.id,
    invoiceId: invoice.id,
    bookingId: invoice.bookingId || undefined,
    documentType: invoice.type,
    action: 'sent',
    actorId,
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
      customerEmail: customer.email,
      total: invoice.total,
    },
  })

  return updated
}

// ============================================
// MARK PAID
// ============================================

/**
 * Mark an invoice as paid
 */
export async function markInvoicePaid(
  invoiceId: string,
  actorId?: string,
  opts?: { paymentMethod?: string; paymentReference?: string }
): Promise<typeof invoices.$inferSelect> {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1)

  if (!invoice) throw new Error('Invoice not found')

  if (invoice.status !== 'sent') {
    throw new Error(`Rechnung ${invoice.invoiceNumber} kann nicht als bezahlt markiert werden (Status: ${invoice.status}).`)
  }

  const [updated] = await db
    .update(invoices)
    .set({
      status: 'paid',
      paidAt: new Date(),
      paymentMethod: opts?.paymentMethod,
      paymentReference: opts?.paymentReference,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId))
    .returning()

  await logDocumentEvent({
    businessId: invoice.businessId,
    invoiceId: invoice.id,
    bookingId: invoice.bookingId || undefined,
    documentType: invoice.type,
    action: 'marked_paid',
    actorId,
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
      paymentMethod: opts?.paymentMethod,
    },
  })

  return updated
}

// ============================================
// STORNO (CANCEL) FLOW
// ============================================

/**
 * Cancel an invoice and create a Stornorechnung (credit note).
 * Returns both the cancelled invoice and the new storno invoice.
 */
export async function cancelInvoiceWithStorno(
  invoiceId: string,
  actorId?: string,
  reason?: string
): Promise<{ cancelled: typeof invoices.$inferSelect; storno: typeof invoices.$inferSelect }> {
  const invoiceData = await db
    .select({
      invoice: invoices,
      business: businesses,
      customer: customers,
    })
    .from(invoices)
    .innerJoin(businesses, eq(invoices.businessId, businesses.id))
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .where(eq(invoices.id, invoiceId))
    .limit(1)

  if (!invoiceData[0]) throw new Error('Invoice not found')

  const { invoice, business, customer } = invoiceData[0]

  if (invoice.status !== 'sent' && invoice.status !== 'paid') {
    throw new Error(
      `Rechnung ${invoice.invoiceNumber} kann nicht storniert werden (Status: ${invoice.status}). ` +
      `Nur versendete oder bezahlte Rechnungen können storniert werden.`
    )
  }

  if (invoice.type === 'storno') {
    throw new Error('Eine Stornorechnung kann nicht erneut storniert werden.')
  }

  // Generate storno invoice number (same sequence)
  const stornoNumber = await generateNextInvoiceNumber(business.id)

  // Create negative line items for storno
  const originalItems = invoice.items as InvoiceLineItem[]
  const stornoItems: InvoiceLineItem[] = originalItems.map(item => ({
    ...item,
    quantity: -Math.abs(item.quantity),
    total: (-Math.abs(parseFloat(item.total))).toFixed(2),
  }))

  const stornoSubtotal = -Math.abs(parseFloat(invoice.subtotal))
  const stornoTaxAmount = -Math.abs(parseFloat(invoice.taxAmount || '0'))
  const stornoTotal = -Math.abs(parseFloat(invoice.total))

  const today = new Date()
  const issueDate = today.toISOString().split('T')[0]
  const dueDate = today.toISOString().split('T')[0] // Immediate for storno

  const stornoNotes = reason
    ? `Stornorechnung zu ${invoice.invoiceNumber}. Grund: ${reason}`
    : `Stornorechnung zu ${invoice.invoiceNumber}.`

  // Create storno invoice
  const [stornoInvoice] = await db
    .insert(invoices)
    .values({
      businessId: business.id,
      bookingId: invoice.bookingId,
      customerId: invoice.customerId,
      invoiceNumber: stornoNumber,
      items: stornoItems,
      subtotal: stornoSubtotal.toFixed(2),
      taxRate: invoice.taxRate,
      taxAmount: stornoTaxAmount.toFixed(2),
      total: stornoTotal.toFixed(2),
      currency: invoice.currency,
      status: 'sent',
      type: 'storno',
      originalInvoiceId: invoice.id,
      sentAt: today,
      issueDate,
      serviceDate: invoice.serviceDate,
      dueDate,
      notes: stornoNotes,
    })
    .returning()

  // Mark original as cancelled and link to storno
  const [cancelled] = await db
    .update(invoices)
    .set({
      status: 'cancelled',
      cancelledAt: today,
      stornoInvoiceId: stornoInvoice.id,
      updatedAt: today,
    })
    .where(eq(invoices.id, invoiceId))
    .returning()

  // Generate storno PDF
  await generateAndUploadInvoicePdf(stornoInvoice.id)

  // Audit trail
  await logDocumentEvent({
    businessId: business.id,
    invoiceId: invoice.id,
    bookingId: invoice.bookingId || undefined,
    documentType: 'invoice',
    action: 'cancelled',
    actorId,
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
      stornoInvoiceId: stornoInvoice.id,
      stornoNumber,
      reason,
    },
  })

  await logDocumentEvent({
    businessId: business.id,
    invoiceId: stornoInvoice.id,
    bookingId: invoice.bookingId || undefined,
    documentType: 'storno',
    action: 'storno_created',
    actorId,
    metadata: {
      stornoNumber,
      originalInvoiceNumber: invoice.invoiceNumber,
      reason,
    },
  })

  return { cancelled, storno: stornoInvoice }
}

// ============================================
// REPLACEMENT INVOICE
// ============================================

/**
 * Create a new draft invoice for a booking after cancellation.
 */
export async function createReplacementInvoice(
  bookingId: string,
  cancelledInvoiceId: string,
  actorId?: string
): Promise<typeof invoices.$inferSelect> {
  // Create a fresh invoice from current booking items
  const newInvoice = await createInvoiceForBooking(bookingId)

  // Link the cancelled invoice to the replacement
  await db
    .update(invoices)
    .set({ replacementInvoiceId: newInvoice.id, updatedAt: new Date() })
    .where(eq(invoices.id, cancelledInvoiceId))

  await logDocumentEvent({
    businessId: newInvoice.businessId,
    invoiceId: newInvoice.id,
    bookingId,
    documentType: 'invoice',
    action: 'created',
    actorId,
    metadata: {
      invoiceNumber: newInvoice.invoiceNumber,
      replacesInvoiceId: cancelledInvoiceId,
    },
  })

  return newInvoice
}

// ============================================
// QUERY FUNCTIONS
// ============================================

export async function getInvoiceById(invoiceId: string) {
  const result = await db
    .select({
      invoice: invoices,
      business: businesses,
      customer: customers,
      booking: bookings,
      service: services,
    })
    .from(invoices)
    .innerJoin(businesses, eq(invoices.businessId, businesses.id))
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(bookings, eq(invoices.bookingId, bookings.id))
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(invoices.id, invoiceId))
    .limit(1)

  return result[0] || null
}

/**
 * Get the active (non-cancelled, non-storno) invoice for a booking
 */
export async function getInvoiceByBookingId(bookingId: string) {
  const result = await db
    .select()
    .from(invoices)
    .where(and(
      eq(invoices.bookingId, bookingId),
      ne(invoices.status, 'cancelled'),
      ne(invoices.type, 'storno'),
    ))
    .limit(1)

  return result[0] || null
}

/**
 * Get ALL invoices for a booking (including cancelled and stornos) for history UI
 */
export async function getAllInvoicesForBooking(bookingId: string) {
  return db
    .select()
    .from(invoices)
    .where(eq(invoices.bookingId, bookingId))
    .orderBy(desc(invoices.createdAt))
}

export async function updateCustomerAddress(
  customerId: string,
  businessId: string,
  data: {
    street?: string
    city?: string
    postalCode?: string
    country?: string
  }
) {
  const [updated] = await db
    .update(customers)
    .set(data)
    .where(and(
      eq(customers.id, customerId),
      eq(customers.businessId, businessId)
    ))
    .returning()

  return updated
}
