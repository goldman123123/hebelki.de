'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Clock, Edit, Eye, EyeOff, Trash2, MoreVertical } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

interface Service {
  id: string
  name: string
  description: string | null
  category: string | null
  durationMinutes: number
  bufferMinutes: number | null
  price: string | null
  capacity: number | null
  isActive: boolean | null
  sortOrder: number | null
}

interface ServiceCardProps {
  service: Service
  selected: boolean
  onToggleSelect: () => void
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
}

export function ServiceCard({ service, selected, onToggleSelect, onEdit, onToggleActive, onDelete }: ServiceCardProps) {
  const t = useTranslations('dashboard.services')
  const isMobile = useIsMobile()

  return (
    <div className={`p-4 transition-colors hover:bg-gray-50`}>
      <div className="flex items-start justify-between gap-3 md:gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Selection Checkbox */}
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-base md:text-lg">{service.name}</h3>
              {!service.isActive && (
                <Badge variant="outline" className="text-xs">
                  {t('inactiveLabel')}
                </Badge>
              )}
            </div>
            {service.description && (
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{service.description}</p>
            )}
            <div className="flex items-center gap-3 md:gap-4 text-sm text-gray-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {service.durationMinutes} min
              </span>
              {service.bufferMinutes && service.bufferMinutes > 0 && (
                <span>{t('buffer', { minutes: service.bufferMinutes })}</span>
              )}
              {service.price ? (
                <span className="font-semibold text-gray-900">{service.price} &euro;</span>
              ) : (
                <span className="text-gray-400">{t('free')}</span>
              )}
              {service.capacity && service.capacity > 1 && (
                <Badge variant="secondary" className="ml-1">
                  {t('groupCapacity', { capacity: service.capacity })}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {isMobile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">{t('actions')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                {t('edit')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleActive}>
                {service.isActive ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    {t('hide')}
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    {t('show')}
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleActive}
              className="gap-2"
            >
              {service.isActive ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  {t('hide')}
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  {t('show')}
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4 mr-1" />
              {t('edit')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
