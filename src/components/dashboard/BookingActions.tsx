'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FormDialog, ConfirmDialog } from '@/components/forms'
import { FormTextarea } from '@/components/forms/FormField'
import { Check, X, Eye, MoreHorizontal, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface BookingActionsProps {
  bookingId: string
  status: string
  onStatusChange?: () => void
}

export function BookingActions({ bookingId, status, onStatusChange }: BookingActionsProps) {
  const router = useRouter()
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  async function handleApprove() {
    setIsApproving(true)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      })
      if (res.ok) {
        onStatusChange?.()
        router.refresh()
      }
    } finally {
      setIsApproving(false)
    }
  }

  async function handleReject() {
    setIsRejecting(true)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          cancellationReason: rejectReason || 'Vom Personal abgelehnt',
          cancelledBy: 'staff',
        }),
      })
      if (res.ok) {
        setShowRejectDialog(false)
        setRejectReason('')
        onStatusChange?.()
        router.refresh()
      }
    } finally {
      setIsRejecting(false)
    }
  }

  async function handleComplete() {
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      if (res.ok) {
        setShowCompleteDialog(false)
        onStatusChange?.()
        router.refresh()
      }
    } catch {
      // Handle error silently
    }
  }

  async function handleNoShow() {
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'no_show' }),
      })
      if (res.ok) {
        onStatusChange?.()
        router.refresh()
      }
    } catch {
      // Handle error silently
    }
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-green-600 hover:bg-green-50 hover:text-green-700"
          onClick={handleApprove}
          disabled={isApproving}
        >
          {isApproving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          <span className="ml-1 hidden sm:inline">Bestätigen</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => setShowRejectDialog(true)}
        >
          <X className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Ablehnen</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => router.push(`/bookings/${bookingId}`)}
        >
          <Eye className="h-4 w-4" />
        </Button>

        <FormDialog
          open={showRejectDialog}
          onOpenChange={setShowRejectDialog}
          title="Buchung ablehnen"
          description="Bitte geben Sie einen Grund für die Ablehnung dieser Buchung an."
          onSubmit={handleReject}
          isSubmitting={isRejecting}
          submitLabel="Ablehnen"
          variant="destructive"
        >
          <FormTextarea
            label="Grund"
            name="reason"
            placeholder="Grund für Ablehnung eingeben..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </FormDialog>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/bookings/${bookingId}`)}>
          <Eye className="mr-2 h-4 w-4" />
          Details anzeigen
        </DropdownMenuItem>
        {status === 'confirmed' && (
          <>
            <DropdownMenuItem onClick={() => setShowCompleteDialog(true)}>
              <Check className="mr-2 h-4 w-4" />
              Als abgeschlossen markieren
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-orange-600"
              onClick={handleNoShow}
            >
              <X className="mr-2 h-4 w-4" />
              Als nicht erschienen markieren
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => setShowRejectDialog(true)}
            >
              <X className="mr-2 h-4 w-4" />
              Buchung stornieren
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>

      <ConfirmDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        title="Als abgeschlossen markieren"
        description="Möchten Sie diese Buchung wirklich als abgeschlossen markieren?"
        onConfirm={handleComplete}
        confirmLabel="Abschließen"
        variant="default"
      />

      <FormDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        title="Buchung stornieren"
        description="Bitte geben Sie einen Grund für die Stornierung dieser Buchung an."
        onSubmit={handleReject}
        isSubmitting={isRejecting}
        submitLabel="Buchung stornieren"
        variant="destructive"
      >
        <FormTextarea
          label="Grund"
          name="reason"
          placeholder="Grund für Stornierung eingeben..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </FormDialog>
    </DropdownMenu>
  )
}
