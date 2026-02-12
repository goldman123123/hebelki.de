'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface EditingService {
  name: string
  description?: string | null
  category?: string | null
  durationMinutes: number
  bufferMinutes?: number | null
  price?: string | null
  capacity?: number | null
}

interface ServiceFormFieldsProps {
  data: EditingService
  onChange: (data: EditingService) => void
}

export function ServiceFormFields({ data, onChange }: ServiceFormFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Dienstleistungsname *
        </label>
        <Input
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="z.B. Haarschnitt, Massage, Beratung"
          className="font-medium"
        />
      </div>
      <div className="col-span-2">
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Beschreibung
        </label>
        <Textarea
          value={data.description || ''}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="Beschreiben Sie Ihre Dienstleistung..."
          rows={2}
          className="resize-none"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Kategorie
        </label>
        <Input
          value={data.category || ''}
          onChange={(e) => onChange({ ...data, category: e.target.value })}
          placeholder="z.B. Haare, Wellness"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Dauer (Minuten) *
        </label>
        <Input
          type="number"
          value={data.durationMinutes}
          onChange={(e) => onChange({ ...data, durationMinutes: Number(e.target.value) })}
          min="1"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Pufferzeit (Minuten)
        </label>
        <Input
          type="number"
          value={data.bufferMinutes || 0}
          onChange={(e) => onChange({ ...data, bufferMinutes: Number(e.target.value) })}
          min="0"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Preis (€)
        </label>
        <Input
          type="number"
          step="0.01"
          value={data.price || ''}
          onChange={(e) => onChange({ ...data, price: e.target.value })}
          placeholder="0,00"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Kapazität (Teilnehmer)
        </label>
        <Input
          type="number"
          value={data.capacity || 1}
          onChange={(e) => onChange({ ...data, capacity: Number(e.target.value) })}
          min="1"
          max="100"
          placeholder="1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Wie viele Personen können diesen Service gleichzeitig buchen?
          Auf 1 setzen für Einzeltermine, höher für Gruppenkurse.
        </p>
      </div>
    </div>
  )
}
