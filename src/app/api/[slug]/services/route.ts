import { NextRequest, NextResponse } from 'next/server'
import { getBusinessBySlug, getServicesByBusiness } from '@/lib/db/queries'

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

    const services = await getServicesByBusiness(business.id)

    return NextResponse.json({
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        durationMinutes: s.durationMinutes,
        bufferMinutes: s.bufferMinutes,
        price: s.price,
        category: s.category,
      })),
    })
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
