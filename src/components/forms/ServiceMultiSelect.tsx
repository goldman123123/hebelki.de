'use client'

import { Label } from '@/components/ui/label'

interface Service {
  id: string
  name: string
  category: string | null
}

interface ServiceMultiSelectProps {
  services: Service[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  error?: string
}

export function ServiceMultiSelect({
  services,
  selectedIds,
  onChange,
  error,
}: ServiceMultiSelectProps) {
  // Group by category
  const grouped = services.reduce((acc, service) => {
    const cat = service.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(service)
    return acc
  }, {} as Record<string, Service[]>)

  function handleToggle(serviceId: string) {
    if (selectedIds.includes(serviceId)) {
      onChange(selectedIds.filter(id => id !== serviceId))
    } else {
      onChange([...selectedIds, serviceId])
    }
  }

  return (
    <div className="space-y-3">
      <Label>Assigned Services</Label>
      <p className="text-sm text-gray-500">
        Select which services this staff member can perform
      </p>

      {services.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">
          No services available. Create services first.
        </p>
      ) : (
        <div className="max-h-48 space-y-4 overflow-y-auto rounded-lg border p-3">
          {Object.entries(grouped).map(([category, categoryServices]) => (
            <div key={category}>
              <p className="mb-2 text-xs font-medium uppercase text-gray-500">
                {category}
              </p>
              <div className="space-y-2">
                {categoryServices.map((service) => (
                  <label
                    key={service.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(service.id)}
                      onChange={() => handleToggle(service.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">{service.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
