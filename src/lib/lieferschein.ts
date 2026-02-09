/**
 * Lieferschein (Delivery Note) Generation
 *
 * Generates Lieferschein PDFs using Puppeteer and stores them in Cloudflare R2.
 * Uses timestamped R2 keys for version history — old versions remain in R2.
 */

import { db } from './db'
import { bookings, businesses, customers, services, documentEvents, type InvoiceLineItem } from './db/schema'
import { eq } from 'drizzle-orm'
import { generateLieferscheinHtml } from './lieferschein-templates'
import { generatePdfFromHtml } from './pdf'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

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

/**
 * Generate R2 key for Lieferschein PDF with timestamp for versioning.
 * Old versions remain in R2 (not deleted).
 */
export function generateLieferscheinR2Key(businessId: string, bookingId: string): string {
  const timestamp = Date.now()
  return `tenant/${businessId}/lieferschein/${bookingId}-v${timestamp}.pdf`
}

/**
 * Generate Lieferschein PDF for a booking and upload to R2.
 * Logs document event for audit trail.
 */
export async function generateAndUploadLieferschein(bookingId: string, actorId?: string): Promise<string> {
  // Load booking with related data
  const result = await db
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

  if (!result[0]) {
    throw new Error('Booking not found')
  }

  const { booking, service, customer, business } = result[0]

  if (!customer) {
    throw new Error('Customer not found for this booking')
  }

  // Get items from booking
  const bookingItems = (booking as Record<string, unknown>).items as InvoiceLineItem[] | null

  if (!bookingItems || bookingItems.length === 0) {
    throw new Error('Keine Positionen vorhanden. Bitte fügen Sie zuerst Positionen zur Buchung hinzu.')
  }

  // Build items: service first, then manual positions
  const serviceItem: InvoiceLineItem = {
    description: service?.name || 'Dienstleistung',
    quantity: 1,
    unitPrice: '0.00',
    total: '0.00',
  }
  const items: InvoiceLineItem[] = [serviceItem, ...bookingItems]

  // Generate HTML
  const html = generateLieferscheinHtml({
    businessName: business.name,
    businessAddress: business.address,
    businessEmail: business.email,
    businessPhone: business.phone,
    businessWebsite: business.website,
    businessLogoUrl: business.logoUrl,
    primaryColor: business.primaryColor || '#3B82F6',
    customerName: customer.name || 'Kunde',
    customerStreet: customer.street,
    customerPostalCode: customer.postalCode,
    customerCity: customer.city,
    customerCountry: customer.country,
    items,
    deliveryDate: booking.startsAt.toISOString().split('T')[0],
    bookingId: booking.id,
    notes: booking.notes,
  })

  // Generate PDF
  const pdfBuffer = await generatePdfFromHtml(html)

  // Upload to R2 with timestamped key (preserves old versions)
  const r2Key = generateLieferscheinR2Key(business.id, booking.id)

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
  })

  await r2Client.send(command)

  // Determine if this is a create or regenerate
  const isRegenerate = !!booking.lieferscheinR2Key

  // Update booking with latest R2 key
  await db
    .update(bookings)
    .set({
      lieferscheinR2Key: r2Key,
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId))

  // Log audit event
  await db.insert(documentEvents).values({
    businessId: business.id,
    bookingId: booking.id,
    documentType: 'lieferschein',
    action: isRegenerate ? 'regenerated' : 'created',
    actorType: 'staff',
    actorId,
    metadata: { r2Key },
  })

  return r2Key
}
