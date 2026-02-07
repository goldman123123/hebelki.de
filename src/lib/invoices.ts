/**
 * Invoice Generation Library
 *
 * Handles German-compliant invoice creation following § 14 UStG requirements.
 * Generates PDFs using Puppeteer and stores them in Cloudflare R2.
 */

import { db } from './db'
import {
  invoices,
  invoiceSequences,
  businesses,
  customers,
  bookings,
  services,
  type InvoiceLineItem,
  type BusinessTaxSettings,
} from './db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { generateInvoiceHtml } from './invoice-templates'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

// R2 client configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'hebelki'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
})

/**
 * Generate the next invoice number for a business
 * Format: RE-{year}-{sequence} (e.g., RE-2026-00001)
 */
export async function generateNextInvoiceNumber(businessId: string): Promise<string> {
  const year = new Date().getFullYear()

  // Use a transaction to safely increment the sequence
  const result = await db.transaction(async (tx) => {
    // Try to get existing sequence for this year
    const existing = await tx
      .select()
      .from(invoiceSequences)
      .where(and(
        eq(invoiceSequences.businessId, businessId),
        eq(invoiceSequences.year, year)
      ))
      .limit(1)

    let nextNumber: number

    if (existing[0]) {
      // Increment existing sequence
      nextNumber = existing[0].lastNumber + 1
      await tx
        .update(invoiceSequences)
        .set({
          lastNumber: nextNumber,
          updatedAt: new Date(),
        })
        .where(eq(invoiceSequences.id, existing[0].id))
    } else {
      // Create new sequence for this year
      nextNumber = 1
      await tx.insert(invoiceSequences).values({
        businessId,
        year,
        lastNumber: nextNumber,
      })
    }

    return nextNumber
  })

  // Format: RE-2026-00001
  return `RE-${year}-${String(result).padStart(5, '0')}`
}

/**
 * Get business tax settings from the settings JSONB field
 */
export function getBusinessTaxSettings(business: typeof businesses.$inferSelect): BusinessTaxSettings {
  const settings = business.settings as Record<string, unknown> | null
  return {
    taxId: settings?.taxId as string | undefined,
    taxRate: settings?.taxRate as number | undefined ?? 19,
    isKleinunternehmer: settings?.isKleinunternehmer as boolean | undefined ?? false,
    showLogoOnInvoice: settings?.showLogoOnInvoice as boolean | undefined ?? true,
  }
}

/**
 * Calculate tax amounts based on subtotal and tax settings
 */
export function calculateTaxAmounts(subtotal: number, taxSettings: BusinessTaxSettings): {
  taxRate: number
  taxAmount: number
  total: number
} {
  if (taxSettings.isKleinunternehmer) {
    // Kleinunternehmerregelung: No VAT charged
    return {
      taxRate: 0,
      taxAmount: 0,
      total: subtotal,
    }
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

/**
 * Create an invoice for a booking
 */
export async function createInvoiceForBooking(bookingId: string): Promise<typeof invoices.$inferSelect> {
  // Load booking with related data
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

  // Check if customer has address (required for invoice)
  if (!customer.street || !customer.city || !customer.postalCode) {
    throw new Error('Customer address is incomplete. Please add street, city, and postal code.')
  }

  // Check if invoice already exists for this booking
  const existingInvoice = await db
    .select()
    .from(invoices)
    .where(eq(invoices.bookingId, bookingId))
    .limit(1)

  if (existingInvoice[0]) {
    throw new Error('Invoice already exists for this booking')
  }

  // Get tax settings
  const taxSettings = getBusinessTaxSettings(business)

  // Calculate amounts
  const unitPrice = booking.price ? parseFloat(booking.price) : (service?.price ? parseFloat(service.price) : 0)
  const subtotal = unitPrice
  const { taxRate, taxAmount, total } = calculateTaxAmounts(subtotal, taxSettings)

  // Generate invoice number
  const invoiceNumber = await generateNextInvoiceNumber(business.id)

  // Create line items
  const durationMinutes = service?.durationMinutes || 60
  const lineItems: InvoiceLineItem[] = [{
    description: service?.name || 'Dienstleistung',
    quantity: 1,
    unitPrice: unitPrice.toFixed(2),
    total: unitPrice.toFixed(2),
  }]

  // Determine dates
  const today = new Date()
  const issueDate = today.toISOString().split('T')[0]
  const serviceDate = booking.startsAt.toISOString().split('T')[0]
  const dueDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 14 days

  // Create invoice record
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
      issueDate,
      serviceDate,
      dueDate,
    })
    .returning()

  return invoice
}

/**
 * Generate R2 key for invoice PDF
 */
export function generateInvoiceR2Key(businessId: string, invoiceId: string): string {
  return `tenant/${businessId}/invoices/${invoiceId}.pdf`
}

/**
 * Generate invoice PDF and upload to R2
 */
export async function generateAndUploadInvoicePdf(invoiceId: string): Promise<string> {
  // Load invoice with related data
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

  if (!customer) {
    throw new Error('Customer not found for this invoice')
  }

  // Get tax settings for Kleinunternehmer notice
  const taxSettings = getBusinessTaxSettings(business)

  // Generate HTML
  const html = generateInvoiceHtml({
    invoice,
    business,
    customer,
    taxSettings,
    serviceName: service?.name || 'Dienstleistung',
    serviceDate: invoice.serviceDate || invoice.issueDate,
    showLogo: taxSettings.showLogoOnInvoice !== false,
  })

  // Generate PDF using Puppeteer
  const pdfBuffer = await generatePdfFromHtml(html)

  // Upload to R2
  const r2Key = generateInvoiceR2Key(business.id, invoice.id)
  await uploadToR2(r2Key, pdfBuffer)

  // Update invoice with R2 key
  await db
    .update(invoices)
    .set({
      pdfR2Key: r2Key,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId))

  return r2Key
}

/**
 * Generate PDF from HTML using Puppeteer
 */
async function generatePdfFromHtml(html: string): Promise<Buffer> {
  // Dynamic import for Puppeteer (not needed at module load time)
  try {
    // Try @sparticuz/chromium for Vercel serverless
    const chromium = await import('@sparticuz/chromium')
    const puppeteerCore = await import('puppeteer-core')

    const browser = await puppeteerCore.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1200, height: 800 },
      executablePath: await chromium.default.executablePath(),
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    })

    await browser.close()
    return Buffer.from(pdfBuffer)
  } catch {
    // Fallback to regular puppeteer for local development
    const puppeteer = await import('puppeteer')

    const browser = await puppeteer.default.launch({
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    })

    await browser.close()
    return Buffer.from(pdfBuffer)
  }
}

/**
 * Upload PDF buffer to R2
 */
async function uploadToR2(r2Key: string, pdfBuffer: Buffer): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
  })

  await r2Client.send(command)
}

/**
 * Get invoice by ID
 */
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
 * Get invoice by booking ID
 */
export async function getInvoiceByBookingId(bookingId: string) {
  const result = await db
    .select()
    .from(invoices)
    .where(eq(invoices.bookingId, bookingId))
    .limit(1)

  return result[0] || null
}

/**
 * Update customer address
 */
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
