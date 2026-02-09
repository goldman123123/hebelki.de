'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusConfig = {
  unconfirmed: {
    label: 'Unbestätigt',
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  },
  pending: {
    label: 'Ausstehend',
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  },
  confirmed: {
    label: 'Bestätigt',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  cancelled: {
    label: 'Storniert',
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
  completed: {
    label: 'Abgeschlossen',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  no_show: {
    label: 'Nicht erschienen',
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    className: 'bg-gray-100 text-gray-800',
  }

  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}
