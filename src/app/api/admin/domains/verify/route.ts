/**
 * Verify Custom Domain DNS
 *
 * POST /api/admin/domains/verify
 *
 * Checks DNS verification status for the business's custom domain via Vercel API.
 */

import { NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || 'lFYBJ0tJSy62euJmtn8Z5Lbt'
const VERCEL_TEAM_ID = 'fabians-projects-0c8534c0'
const VERCEL_PROJECT_ID = 'prj_CGXamcDixXP4Gv16FfLrCgvzGITk'

export async function POST() {
  try {
    const authResult = await requireBusinessAuth()
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const domain = authResult.business.customDomain
    if (!domain) {
      return NextResponse.json(
        { error: 'Keine benutzerdefinierte Domain konfiguriert.' },
        { status: 400 }
      )
    }

    // Check domain config via Vercel API
    const vercelRes = await fetch(
      `https://api.vercel.com/v6/domains/${domain}/config?teamId=${VERCEL_TEAM_ID}`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      }
    )

    const configData = await vercelRes.json()

    // Also get domain info from the project
    const domainRes = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}?teamId=${VERCEL_TEAM_ID}`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      }
    )

    const domainData = await domainRes.json()

    const verified = domainData.verified === true
    const misconfigured = configData.misconfigured === true

    return NextResponse.json({
      domain,
      verified,
      misconfigured,
      verification: domainData.verification || null,
      configuredBy: configData.cnames || null,
    })
  } catch (error) {
    console.error('[Domains] Error verifying domain:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
