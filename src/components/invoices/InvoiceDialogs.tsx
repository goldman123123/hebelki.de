'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface SendInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceNumber: string
  customerEmail: string | null
  onSend: () => Promise<void>
  sending: boolean
}

export function SendInvoiceDialog({
  open,
  onOpenChange,
  invoiceNumber,
  customerEmail,
  onSend,
  sending,
}: SendInvoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rechnung versenden</DialogTitle>
          <DialogDescription>
            Rechnung {invoiceNumber} wird an{' '}
            <strong>{customerEmail || 'den Kunden'}</strong> gesendet.
            Nach dem Versand kann die Rechnung nicht mehr bearbeitet werden.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={onSend}
            disabled={sending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Jetzt senden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface CancelInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceNumber: string
  onCancel: (reason: string, createReplacement: boolean) => Promise<void>
  cancelling: boolean
}

export function CancelInvoiceDialog({
  open,
  onOpenChange,
  invoiceNumber,
  onCancel,
  cancelling,
}: CancelInvoiceDialogProps) {
  const [cancelReason, setCancelReason] = useState('')
  const [createReplacement, setCreateReplacement] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rechnung stornieren</DialogTitle>
          <DialogDescription>
            Es wird eine Stornorechnung zu {invoiceNumber} erstellt.
            Dieser Vorgang kann nicht rückgängig gemacht werden.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label htmlFor="cancel-reason" className="text-sm font-medium text-gray-700">
              Grund (optional)
            </label>
            <input
              id="cancel-reason"
              type="text"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="z.B. Fehlbuchung, geänderter Leistungsumfang"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="create-replacement"
              checked={createReplacement}
              onCheckedChange={(checked) => setCreateReplacement(checked === true)}
            />
            <label htmlFor="create-replacement" className="text-sm text-gray-700">
              Neue Rechnung direkt erstellen
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={() => onCancel(cancelReason, createReplacement)}
            disabled={cancelling}
            variant="destructive"
          >
            {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Stornieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
