import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { AVAILABLE_MODELS } from '@/lib/ai/config'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export async function GET() {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const settings = (authResult.business.settings || {}) as Record<string, unknown>

  return NextResponse.json({
    chatbotModel: settings.aiChatbotModel || 'openai/gpt-4o-2024-08-06',
    websiteModel: settings.aiWebsiteModel || 'google/gemini-2.5-flash',
    extractionModel: settings.aiExtractionModel || 'google/gemini-2.5-flash-lite',
    postModel: settings.aiPostModel || 'google/gemini-2.5-flash',
    hasCustomApiKey: !!settings.aiApiKey,
    availableModels: AVAILABLE_MODELS,
  })
}

const patchSchema = z.object({
  aiChatbotModel: z.string().optional(),
  aiWebsiteModel: z.string().optional(),
  aiExtractionModel: z.string().optional(),
  aiPostModel: z.string().optional(),
  aiApiKey: z.string().nullable().optional(),
})

export async function PATCH(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const currentSettings = (authResult.business.settings as Record<string, unknown>) || {}
  const data = parsed.data
  const newSettings: Record<string, unknown> = { ...currentSettings }

  if (data.aiChatbotModel !== undefined) {
    newSettings.aiChatbotModel = data.aiChatbotModel
  }
  if (data.aiWebsiteModel !== undefined) {
    newSettings.aiWebsiteModel = data.aiWebsiteModel
  }
  if (data.aiExtractionModel !== undefined) {
    newSettings.aiExtractionModel = data.aiExtractionModel
  }
  if (data.aiPostModel !== undefined) {
    newSettings.aiPostModel = data.aiPostModel
  }
  if (data.aiApiKey !== undefined) {
    if (data.aiApiKey === null) {
      delete newSettings.aiApiKey
    } else {
      newSettings.aiApiKey = data.aiApiKey
    }
  }

  await db
    .update(businesses)
    .set({
      settings: newSettings,
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, authResult.business.id))

  return NextResponse.json({
    chatbotModel: newSettings.aiChatbotModel || 'openai/gpt-4o-2024-08-06',
    websiteModel: newSettings.aiWebsiteModel || 'google/gemini-2.5-flash',
    extractionModel: newSettings.aiExtractionModel || 'google/gemini-2.5-flash-lite',
    postModel: newSettings.aiPostModel || 'google/gemini-2.5-flash',
    hasCustomApiKey: !!newSettings.aiApiKey,
    availableModels: AVAILABLE_MODELS,
  })
}
