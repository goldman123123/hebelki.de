'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Pencil, Trash2, Clock } from 'lucide-react'

interface StaffMember {
  id: string
  name: string
  email: string | null
  phone: string | null
  title: string | null
  bio: string | null
  avatarUrl: string | null
  isActive: boolean | null
  serviceIds?: string[]
}

interface Service {
  id: string
  name: string
}

interface StaffCardProps {
  staff: StaffMember
  services: Service[]
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}

export function StaffCard({
  staff,
  services,
  onEdit,
  onDelete,
  onToggleActive,
}: StaffCardProps) {
  const assignedServices = services.filter((s) => staff.serviceIds?.includes(s.id))

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4 flex-1">
            <Avatar className="h-12 w-12">
              <AvatarImage src={staff.avatarUrl || undefined} />
              <AvatarFallback>
                {staff.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{staff.name}</h3>
                {!staff.isActive && (
                  <Badge variant="outline" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </div>
              {staff.title && (
                <p className="text-sm text-gray-600 mb-2">{staff.title}</p>
              )}
              {staff.email && (
                <p className="text-sm text-gray-500">{staff.email}</p>
              )}
              {staff.phone && (
                <p className="text-sm text-gray-500">{staff.phone}</p>
              )}
            </div>
          </div>
        </div>

        {staff.bio && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{staff.bio}</p>
        )}

        {assignedServices.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Services:</p>
            <div className="flex flex-wrap gap-1">
              {assignedServices.map((service) => (
                <Badge key={service.id} variant="secondary" className="text-xs">
                  {service.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onToggleActive}
          >
            {staff.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
