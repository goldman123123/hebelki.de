import { NextRequest, NextResponse } from 'next/server'
import { getBusinessBySlug, getStaffByBusiness, getStaffForService } from '@/lib/db/queries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get('serviceId')

    const business = await getBusinessBySlug(slug)

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    let staffMembers
    if (serviceId) {
      // Get staff who can perform this service
      staffMembers = await getStaffForService(serviceId, business.id)
    } else {
      // Get all staff
      const allStaff = await getStaffByBusiness(business.id)
      staffMembers = allStaff.map((s) => ({
        id: s.id,
        name: s.name,
        title: s.title,
        avatarUrl: s.avatarUrl,
        bio: s.bio,
      }))
    }

    return NextResponse.json({
      staff: staffMembers,
    })
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
