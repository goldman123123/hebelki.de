import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { businessWebsites } from '@/lib/db/schema'
import type { TemplateId, WebsiteSectionContent } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateWebsiteContent } from '@/modules/website/lib/generate-content'

export async function GET() {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const website = await db
    .select()
    .from(businessWebsites)
    .where(eq(businessWebsites.businessId, authResult.business.id))
    .limit(1)
    .then(r => r[0])

  return NextResponse.json({ website: website || null })
}

export async function POST(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const body = await request.json()
  const { templateId } = body as { templateId: TemplateId }

  if (!templateId) {
    return NextResponse.json({ error: 'templateId is required' }, { status: 400 })
  }

  const validTemplates: TemplateId[] = ['dark-luxury', 'brutalism', 'glassmorphism', 'cyberpunk', 'editorial', 'neo-minimal']
  if (!validTemplates.includes(templateId)) {
    return NextResponse.json({ error: 'Invalid templateId' }, { status: 400 })
  }

  try {
    const { sections, metaTitle, metaDescription, model } = await generateWebsiteContent(
      authResult.business.id,
      templateId,
    )

    // Upsert: create or update
    const existing = await db
      .select()
      .from(businessWebsites)
      .where(eq(businessWebsites.businessId, authResult.business.id))
      .limit(1)
      .then(r => r[0])

    let website
    if (existing) {
      ;[website] = await db
        .update(businessWebsites)
        .set({
          templateId,
          sections,
          metaTitle,
          metaDescription,
          lastGeneratedAt: new Date(),
          generationModel: model,
          updatedAt: new Date(),
        })
        .where(eq(businessWebsites.id, existing.id))
        .returning()
    } else {
      ;[website] = await db
        .insert(businessWebsites)
        .values({
          businessId: authResult.business.id,
          templateId,
          sections,
          metaTitle,
          metaDescription,
          lastGeneratedAt: new Date(),
          generationModel: model,
        })
        .returning()
    }

    return NextResponse.json({ website })
  } catch (error) {
    console.error('[POST /api/admin/website] Generation failed:', error)
    return NextResponse.json({ error: 'Content generation failed' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const body = await request.json()

  const existing = await db
    .select()
    .from(businessWebsites)
    .where(eq(businessWebsites.businessId, authResult.business.id))
    .limit(1)
    .then(r => r[0])

  if (!existing) {
    return NextResponse.json({ error: 'No website found' }, { status: 404 })
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }

  if (body.templateId) updates.templateId = body.templateId
  if (body.sections) updates.sections = body.sections
  if (body.metaTitle !== undefined) updates.metaTitle = body.metaTitle
  if (body.metaDescription !== undefined) updates.metaDescription = body.metaDescription

  if (body.isPublished !== undefined) {
    updates.isPublished = body.isPublished
    if (body.isPublished) updates.publishedAt = new Date()
  }

  // Allow updating a single section
  if (body.sectionName && body.sectionData && existing.sections) {
    const currentSections = existing.sections as WebsiteSectionContent
    updates.sections = {
      ...currentSections,
      [body.sectionName]: body.sectionData,
    }
  }

  const [website] = await db
    .update(businessWebsites)
    .set(updates)
    .where(eq(businessWebsites.id, existing.id))
    .returning()

  return NextResponse.json({ website })
}
