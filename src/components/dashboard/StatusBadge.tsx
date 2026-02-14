'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

const statusStyles: Record<string, string> = {
  unconfirmed: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  pending: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  confirmed: 'bg-green-100 text-green-800 hover:bg-green-100',
  cancelled: 'bg-red-100 text-red-800 hover:bg-red-100',
  completed: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  no_show: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const t = useTranslations('dashboard.statuses')

  const style = statusStyles[status] || 'bg-gray-100 text-gray-800'
  const label = (() => {
    try { return t(status) } catch { return status }
  })()

  return (
    <Badge className={cn(style, className)}>
      {label}
    </Badge>
  )
}
