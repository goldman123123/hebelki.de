'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ServiceFormFields } from './ServiceFormFields'
import { StaffPriorityInline } from './StaffPriorityInline'
import { Check, X, Loader2 } from 'lucide-react'

interface EditingService {
  name: string
  description?: string | null
  category?: string | null
  durationMinutes: number
  bufferMinutes?: number | null
  price?: string | null
  capacity?: number | null
  isActive?: boolean | null
}

interface ServiceEditSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceId: string | null
  initialData: EditingService | null
  onSave: (data: EditingService) => Promise<void>
  isNew?: boolean
}

export function ServiceEditSheet({ open, onOpenChange, serviceId, initialData, onSave, isNew }: ServiceEditSheetProps) {
  const [data, setData] = useState<EditingService>(initialData || {
    name: '',
    description: '',
    category: '',
    durationMinutes: 60,
    bufferMinutes: 0,
    price: '',
    capacity: 1,
    isActive: true,
  })
  const [saving, setSaving] = useState(false)

  // Sync initial data when it changes
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && initialData) {
      setData(initialData)
    }
    onOpenChange(nextOpen)
  }

  const handleSave = async () => {
    if (!data.name.trim()) return
    setSaving(true)
    try {
      await onSave(data)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[500px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>
            {isNew ? 'Neue Dienstleistung' : 'Dienstleistung bearbeiten'}
          </SheetTitle>
          <SheetDescription>
            {isNew
              ? 'Geben Sie die Details für Ihre neue Dienstleistung ein'
              : 'Bearbeiten Sie die Details dieser Dienstleistung'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6 pb-4">
            <ServiceFormFields data={data} onChange={setData} />

            {/* Staff Priority Section (only for existing services) */}
            {serviceId && !isNew && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Mitarbeiter-Priorität</h4>
                <p className="text-xs text-gray-500 mb-3">
                  Ziehen zum Sortieren. Obere Mitarbeiter werden bei automatischer Zuweisung zuerst versucht.
                </p>
                <StaffPriorityInline serviceId={serviceId} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="border-t px-6 py-4 flex gap-3">
          <Button
            onClick={handleSave}
            disabled={!data.name.trim() || saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Wird gespeichert...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {isNew ? 'Dienstleistung erstellen' : 'Änderungen speichern'}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <X className="w-4 h-4 mr-2" />
            Abbrechen
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
