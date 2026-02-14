/**
 * Remove Custom Domain
 *
 * DELETE /api/admin/domains/remove
 *
 * Removes the custom domain from the Vercel project and clears it from the business record.
 */

import { NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:admin:domains:remove')

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || 'lFYBJ0tJSy62euJmtn8Z5Lbt'
const VERCEL_TEAM_ID = 'fabians-projects-0c8534c0'
const VERCEL_PROJECT_ID = 'prj_CGXamcDixXP4Gv16FfLrCgvzGITk'

export async function DELETE() {
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

    // Remove domain from Vercel project
    const vercelRes = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}?teamId=${VERCEL_TEAM_ID}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      }
    )

    if (!vercelRes.ok && vercelRes.status !== 404) {
      const vercelData = await vercelRes.json()
      log.error('Vercel API error removing domain:', vercelData)
      // Continue anyway - clear from DB even if Vercel removal fails
    }

    // Clear domain from business record
    await db
      .update(businesses)
      .set({
        customDomain: null,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, authResult.business.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Error removing domain:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
