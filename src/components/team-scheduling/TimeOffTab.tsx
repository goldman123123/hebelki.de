'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OverridesList } from '@/components/availability/OverridesList'
import { OverrideDialog } from '@/components/availability/OverrideDialog'
import { Plus } from 'lucide-react'

interface Override {
  override: {
    id: string
    date: string
    isAvailable: boolean | null
    startTime: string | null
    endTime: string | null
    reason: string | null
    staffId: string | null
  }
  staffMember: { name: string } | null
}

interface Staff {
  id: string
  name: string
  isActive: boolean | null
}

interface TimeOffTabProps {
  overrides: Override[]
  staffMembers: Staff[]
  onRefresh: () => void
}

export function TimeOffTab({
  overrides,
  staffMembers,
  onRefresh,
}: TimeOffTabProps) {
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)
  const [deletingOverride, setDeletingOverride] = useState<string | null>(null)

  async function handleAddOverride(data: {
    date: string
    isAvailable: boolean
    startTime?: string
    endTime?: string
    reason?: string
    staffId?: string
  }) {
    await fetch('/api/admin/availability/overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    onRefresh()
  }

  async function handleDeleteOverride(id: string) {
    setDeletingOverride(id)
    try {
      await fetch(`/api/admin/availability/overrides/${id}`, {
        method: 'DELETE',
      })
      onRefresh()
    } finally {
      setDeletingOverride(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Time Off / Holidays</CardTitle>
            <CardDescription>
              Block off specific dates or set special hours
            </CardDescription>
          </div>
          <Button onClick={() => setShowOverrideDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Time Off
          </Button>
        </CardHeader>
        <CardContent>
          <OverridesList
            overrides={overrides.map((o) => ({
              id: o.override.id,
              date: o.override.date,
              isAvailable: o.override.isAvailable,
              startTime: o.override.startTime,
              endTime: o.override.endTime,
              reason: o.override.reason,
              staffName: o.staffMember?.name,
            }))}
            onDelete={handleDeleteOverride}
            isDeleting={deletingOverride}
          />
        </CardContent>
      </Card>

      <OverrideDialog
        open={showOverrideDialog}
        onOpenChange={setShowOverrideDialog}
        onSubmit={handleAddOverride}
        staff={staffMembers}
      />
    </>
  )
}
