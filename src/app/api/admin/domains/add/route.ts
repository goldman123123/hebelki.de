/**
 * Add Custom Domain
 *
 * POST /api/admin/domains/add
 *
 * Adds a custom domain to the Vercel project and saves it to the business record.
 * Requires Pro+ plan (custom_domain entitlement).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { hasFeature } from '@/modules/core/entitlements'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:admin:domains:add')

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || 'lFYBJ0tJSy62euJmtn8Z5Lbt'
const VERCEL_TEAM_ID = 'fabians-projects-0c8534c0'
const VERCEL_PROJECT_ID = 'prj_CGXamcDixXP4Gv16FfLrCgvzGITk'

const domainSchema = z.object({
  domain: z.string()
    .min(4)
    .max(253)
    .regex(/^(?!-)[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/, 'Ungültiger Domain-Name'),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireBusinessAuth()
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    // Check entitlement
    if (!hasFeature(authResult.business, 'custom_domain')) {
      return NextResponse.json(
        { error: 'Benutzerdefinierte Domains erfordern einen Pro- oder Business-Tarif.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = domainSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const domain = parsed.data.domain.toLowerCase()

    // Prevent using hebelki.de subdomains as custom domains
    if (domain.endsWith('.hebelki.de') || domain === 'hebelki.de') {
      return NextResponse.json(
        { error: 'hebelki.de-Subdomains können nicht als benutzerdefinierte Domain verwendet werden.' },
        { status: 400 }
      )
    }

    // Add domain to Vercel project
    const vercelRes = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains?teamId=${VERCEL_TEAM_ID}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: domain }),
      }
    )

    const vercelData = await vercelRes.json()

    if (!vercelRes.ok) {
      // Vercel returns specific error codes
      const errorMsg = vercelData?.error?.message || 'Vercel API-Fehler'
      log.error('Vercel API error:', vercelData)
      return NextResponse.json(
        { error: `Domain konnte nicht hinzugefügt werden: ${errorMsg}` },
        { status: 400 }
      )
    }

    // Save domain to business record
    await db
      .update(businesses)
      .set({
        customDomain: domain,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, authResult.business.id))

    return NextResponse.json({
      success: true,
      domain,
      verification: vercelData.verification || null,
      verified: vercelData.verified || false,
    })
  } catch (error) {
    log.error('Error adding domain:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
