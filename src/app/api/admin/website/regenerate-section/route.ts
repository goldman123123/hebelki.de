import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { businessWebsites } from '@/lib/db/schema'
import type { TemplateId, WebsiteSectionContent } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { regenerateSection } from '@/modules/website/lib/generate-content'

export async function POST(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const body = await request.json()
  const { sectionName } = body as { sectionName: string }

  if (!sectionName) {
    return NextResponse.json({ error: 'sectionName is required' }, { status: 400 })
  }

  const allowedSections = ['hero', 'about', 'testimonials', 'howItWorks', 'benefits', 'faq', 'bookingCta']
  if (!allowedSections.includes(sectionName)) {
    return NextResponse.json({ error: `Cannot regenerate "${sectionName}".` }, { status: 400 })
  }

  const existing = await db
    .select()
    .from(businessWebsites)
    .where(eq(businessWebsites.businessId, authResult.business.id))
    .limit(1)
    .then(r => r[0])

  if (!existing) {
    return NextResponse.json({ error: 'No website found' }, { status: 404 })
  }

  try {
    const newSectionData = await regenerateSection(
      authResult.business.id,
      sectionName,
      existing.templateId as TemplateId,
    )

    const currentSections = existing.sections as WebsiteSectionContent
    const updatedSections = {
      ...currentSections,
      [sectionName]: {
        ...(currentSections[sectionName as keyof WebsiteSectionContent] as Record<string, unknown>),
        ...newSectionData,
      },
    }

    const [website] = await db
      .update(businessWebsites)
      .set({
        sections: updatedSections,
        updatedAt: new Date(),
      })
      .where(eq(businessWebsites.id, existing.id))
      .returning()

    return NextResponse.json({ website, regeneratedSection: sectionName })
  } catch (error) {
    console.error('[POST /api/admin/website/regenerate-section] Failed:', error)
    return NextResponse.json({ error: 'Regeneration failed' }, { status: 500 })
  }
}
