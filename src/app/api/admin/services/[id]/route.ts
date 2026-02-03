import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getServiceById, updateService, deleteService } from '@/lib/db/queries'
import { serviceSchema } from '@/lib/validations/schemas'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const service = await getServiceById(id)

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  return NextResponse.json({ service })
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

  const parsed = serviceSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const service = await updateService(id, parsed.data)

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  return NextResponse.json({ service })
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
  const service = await deleteService(id)

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  return NextResponse.json({ service })
}
