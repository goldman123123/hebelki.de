'use client'

import { Clock, Euro } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { Service } from './BookingWidget'

interface ServicePickerProps {
  services: Service[]
  currency: string
  onSelect: (service: Service) => void
}

export function ServicePicker({ services, currency, onSelect }: ServicePickerProps) {
  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'Services'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(service)
    return acc
  }, {} as Record<string, Service[]>)

  const categories = Object.keys(groupedServices)

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Select a Service
      </h2>

      {categories.map((category) => (
        <div key={category} className="mb-6 last:mb-0">
          {categories.length > 1 && (
            <h3 className="mb-3 text-sm font-medium text-gray-500 uppercase tracking-wide">
              {category}
            </h3>
          )}

          <div className="space-y-3">
            {groupedServices[category].map((service) => (
              <button
                key={service.id}
                onClick={() => onSelect(service)}
                className={cn(
                  'w-full rounded-lg border border-gray-200 bg-white p-4 text-left',
                  'transition-all hover:border-primary hover:shadow-sm',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{service.name}</h4>
                    {service.description && (
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                        {service.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {service.durationMinutes} min
                      </span>
                    </div>
                  </div>

                  {service.price && (
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center text-lg font-semibold text-gray-900">
                        {formatCurrency(service.price, currency)}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {services.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">No services available at the moment.</p>
        </div>
      )}
    </div>
  )
}
