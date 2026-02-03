import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { deleteAvailabilityOverride, verifyOverrideOwnership } from '@/lib/db/queries'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params

  // Verify ownership
  const isOwner = await verifyOverrideOwnership(id, authResult.business.id)
  if (!isOwner) {
    return NextResponse.json({ error: 'Override not found' }, { status: 404 })
  }

  await deleteAvailabilityOverride(id)

  return NextResponse.json({ success: true })
}
