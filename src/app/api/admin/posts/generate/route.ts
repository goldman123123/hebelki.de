import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { generatePost } from '@/modules/posts/lib/generate-post'
import type { PostType, Platform } from '@/modules/posts/lib/generate-post'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:admin:posts:generate')

const VALID_POST_TYPES: PostType[] = [
  'service_spotlight',
  'tip_educational',
  'seasonal_promo',
  'team_intro',
  'faq_answer',
  'general_awareness',
]

const VALID_PLATFORMS: Platform[] = ['instagram', 'facebook', 'linkedin']

export async function POST(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const body = await request.json()
  const { postType, platform, selectedServiceIds, customInstructions } = body as {
    postType: string
    platform: string
    selectedServiceIds?: string[]
    customInstructions?: string
  }

  if (!postType || !VALID_POST_TYPES.includes(postType as PostType)) {
    return NextResponse.json({ error: 'Invalid postType' }, { status: 400 })
  }

  if (!platform || !VALID_PLATFORMS.includes(platform as Platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  try {
    const { post, model } = await generatePost(authResult.business.id, {
      postType: postType as PostType,
      platform: platform as Platform,
      selectedServiceIds,
      customInstructions,
    })

    return NextResponse.json({ post, model })
  } catch (error) {
    log.error('[POST /api/admin/posts/generate] Failed:', error)
    return NextResponse.json({ error: 'Post generation failed' }, { status: 500 })
  }
}
