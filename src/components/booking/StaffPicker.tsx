'use client'

import { User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Staff } from './BookingWidget'

interface StaffPickerProps {
  staff: Staff[]
  onSelect: (staff: Staff | null) => void
  allowAny?: boolean
}

export function StaffPicker({ staff, onSelect, allowAny = true }: StaffPickerProps) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Choose a Provider
      </h2>

      <div className="space-y-3">
        {/* Any available option */}
        {allowAny && (
          <button
            onClick={() => onSelect(null)}
            className={cn(
              'w-full rounded-lg border border-gray-200 bg-white p-4 text-left',
              'transition-all hover:border-primary hover:shadow-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
            )}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <Users className="h-6 w-6 text-gray-500" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Any Available</h4>
                <p className="text-sm text-gray-500">
                  First available provider
                </p>
              </div>
            </div>
          </button>
        )}

        {/* Individual staff members */}
        {staff.map((member) => (
          <button
            key={member.id}
            onClick={() => onSelect(member)}
            className={cn(
              'w-full rounded-lg border border-gray-200 bg-white p-4 text-left',
              'transition-all hover:border-primary hover:shadow-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
            )}
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={member.avatarUrl || undefined} alt={member.name} />
                <AvatarFallback>
                  {member.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium text-gray-900">{member.name}</h4>
                {member.title && (
                  <p className="text-sm text-gray-500">{member.title}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {staff.length === 0 && !allowAny && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">No providers available.</p>
        </div>
      )}
    </div>
  )
}
