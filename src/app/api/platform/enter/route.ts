import { NextRequest, NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/platform-auth'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin()
    const { businessId } = await req.json()
    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 })
    }
    const cookieStore = await cookies()
    cookieStore.set('hebelki_platform_business_id', businessId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/',
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export async function DELETE() {
  try {
    await requirePlatformAdmin()
    const cookieStore = await cookies()
    cookieStore.delete('hebelki_platform_business_id')
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
