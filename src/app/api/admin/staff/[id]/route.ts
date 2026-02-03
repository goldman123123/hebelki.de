import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStaffWithServices, updateStaff, deleteStaff } from '@/lib/db/queries'
import { staffSchema } from '@/lib/validations/schemas'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const staffMember = await getStaffWithServices(id)

  if (!staffMember) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
  }

  return NextResponse.json({ staff: staffMember })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const parsed = staffSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, avatarUrl, serviceIds, ...rest } = parsed.data

  const staffMember = await updateStaff(id, {
    email: email || null,
    avatarUrl: avatarUrl || null,
    ...rest,
  })

  if (!staffMember) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
  }

  return NextResponse.json({ staff: staffMember })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const staffMember = await deleteStaff(id)

  if (!staffMember) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
  }

  return NextResponse.json({ staff: staffMember })
}
