'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { UserCog, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'

const log = createLogger('ui:DevUserSwitcherPublic')

interface DevUser {
  clerkUserId: string
  role: string
  status: string
  email?: string
  name?: string
}

export function DevUserSwitcherPublic() {
  const { user } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const [users, setUsers] = useState<DevUser[]>([])

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  useEffect(() => {
    fetch('/api/dev/users')
      .then(r => r.json())
      .then(data => {
        if (data.success) setUsers(data.users)
      })
      .catch(() => {})
  }, [])

  const switchToUser = async (userId: string) => {
    try {
      // Get sign-in token from backend
      const response = await fetch('/api/dev/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (data.success && data.url) {
        // Redirect to Clerk's sign-in URL with token
        window.location.href = data.url
      }
    } catch (error) {
      log.error('Failed to switch user:', error)
    }
  }

  const currentUserRole = users.find((u) => u.clerkUserId === user?.id)?.role || 'guest'

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-1.5 text-sm hover:bg-yellow-100"
      >
        <UserCog className="h-4 w-4 text-yellow-600" />
        <span className="font-medium text-gray-700">Dev</span>
        <span className="rounded bg-yellow-200 px-1.5 py-0.5 text-xs font-medium text-yellow-800">
          {currentUserRole}
        </span>
        <ChevronDown className={cn('h-3 w-3 text-gray-500 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="p-3">
              <p className="mb-2 text-xs font-medium text-gray-600">
                Switch User (Dev Only):
              </p>
              <div className="space-y-1">
                {users.length === 0 ? (
                  <p className="px-2 py-3 text-center text-xs text-gray-500">
                    No users found
                  </p>
                ) : (
                  users.map((devUser) => {
                    const isCurrentUser = devUser.clerkUserId === user?.id
                    return (
                      <button
                        key={devUser.clerkUserId}
                        onClick={() => !isCurrentUser && switchToUser(devUser.clerkUserId)}
                        disabled={isCurrentUser}
                        className={cn(
                          'w-full rounded-lg p-2 text-left transition-colors',
                          isCurrentUser
                            ? 'bg-blue-50 ring-1 ring-blue-200 cursor-default'
                            : 'hover:bg-gray-50 cursor-pointer'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-xs font-medium text-gray-900">
                                {devUser.name || 'Unknown User'}
                              </p>
                              {isCurrentUser && (
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-gray-500">
                              {devUser.email || 'No email'}
                            </p>
                            <span className={cn(
                              'mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium',
                              devUser.role === 'owner' ? 'bg-purple-100 text-purple-700'
                              : devUser.role === 'admin' ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                            )}>
                              {devUser.role}
                            </span>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
