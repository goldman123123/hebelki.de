/**
 * Invoice PDF Download API
 *
 * GET /api/invoices/[id]/pdf - Download invoice PDF
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { getInvoiceById, generateAndUploadInvoicePdf, generateInvoiceR2Key } from '@/lib/invoices'
import { getDownloadUrl } from '@/lib/r2/client'
import { db } from '@/lib/db'
import { invoices } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:invoices:id:pdf')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params

  try {
    // Get invoice with related data
    const invoiceData = await getInvoiceById(id)

    if (!invoiceData) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Verify business ownership
    if (invoiceData.invoice.businessId !== authResult.business.id) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    let r2Key = invoiceData.invoice.pdfR2Key

    // If PDF doesn't exist, generate it
    if (!r2Key) {
      r2Key = await generateAndUploadInvoicePdf(id)
    }

    // Generate presigned download URL (valid for 1 hour)
    const downloadUrl = await getDownloadUrl(r2Key, 3600)

    // Redirect to the presigned URL
    return NextResponse.redirect(downloadUrl)
  } catch (error) {
    log.error('Error getting invoice PDF:', error)
    const message = error instanceof Error ? error.message : 'Failed to get invoice PDF'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
