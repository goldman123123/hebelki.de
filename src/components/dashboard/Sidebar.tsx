'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, useUser } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  CalendarCheck,
  Briefcase,
  Users,
  UserRound,
  MessageSquare,
  Headphones,
  Building2,
  Palette,
  Receipt,
} from 'lucide-react'
import { DevUserSwitcher } from './DevUserSwitcher'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Buchungen', href: '/bookings', icon: Calendar },
  { name: 'Kalender', href: '/calendar', icon: CalendarDays },
  { name: 'Dienstleistungen', href: '/services', icon: Briefcase },
  { name: 'Team & Planung', href: '/team-scheduling', icon: Users },
  { name: 'Kunden', href: '/customers', icon: UserRound },
  { name: 'Chatbot & Daten', href: '/chatbot', icon: MessageSquare },
  { name: 'Live-Chat', href: '/support-chat', icon: Headphones },
  { name: 'Unternehmen', href: '/unternehmen', icon: Building2 },
  { name: 'Buchungsregeln', href: '/buchungsregeln', icon: CalendarCheck },
  { name: 'Branding', href: '/branding', icon: Palette },
  { name: 'Steuern', href: '/steuern', icon: Receipt },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()

  return (
    <div className="flex w-64 flex-col border-r bg-white">
      {/* Logo */}
      <Link href="/" className="flex h-16 items-center gap-2 border-b px-6 transition-colors hover:bg-gray-50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
          <Calendar className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold">Hebelki</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Dev User Switcher (development only) */}
      <DevUserSwitcher />

      {/* User */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-gray-700">
              {user?.fullName || user?.firstName || 'User'}
            </p>
            <p className="truncate text-xs text-gray-500">
              {user?.primaryEmailAddress?.emailAddress || ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
