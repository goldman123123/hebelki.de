import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { updateStaffServices, getStaffWithServices } from '@/lib/db/queries'
import { z } from 'zod'

const serviceIdsSchema = z.object({
  serviceIds: z.array(z.string().uuid()),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const parsed = serviceIdsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await updateStaffServices(id, parsed.data.serviceIds)

  const staffMember = await getStaffWithServices(id)

  return NextResponse.json({ staff: staffMember })
}
