import { NextRequest, NextResponse } from 'next/server'
import { getBusinessBySlug } from '@/lib/db/queries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const business = await getBusinessBySlug(slug)

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: business.id,
      name: business.name,
      slug: business.slug,
      type: business.type,
      logoUrl: business.logoUrl,
      primaryColor: business.primaryColor,
      timezone: business.timezone,
      currency: business.currency,
      minBookingNoticeHours: business.minBookingNoticeHours,
      maxAdvanceBookingDays: business.maxAdvanceBookingDays,
      requireApproval: business.requireApproval,
    })
  } catch (error) {
    console.error('Error fetching business config:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
