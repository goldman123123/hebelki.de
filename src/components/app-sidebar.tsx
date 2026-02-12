'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, useUser } from '@clerk/nextjs'
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Briefcase,
  Users,
  UserRound,
  MessageSquare,
  Headphones,
  Building2,
  Globe,
  FileText,
  Bot,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { DevUserSwitcher } from './dashboard/DevUserSwitcher'

const navGroups = [
  {
    label: 'Übersicht',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Buchungen', href: '/bookings', icon: Calendar },
      { name: 'Kalender', href: '/calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'Verwaltung',
    items: [
      { name: 'Dienstleistungen', href: '/services', icon: Briefcase },
      { name: 'Team & Planung', href: '/team-scheduling', icon: Users },
      { name: 'Kunden', href: '/customers', icon: UserRound },
    ],
  },
  {
    label: 'Kommunikation',
    items: [
      { name: 'Chatbot & Daten', href: '/chatbot', icon: MessageSquare },
      { name: 'Live-Chat', href: '/support-chat', icon: Headphones },
    ],
  },
  {
    label: 'Tools',
    items: [
      { name: 'Make Website', href: '/tools/website', icon: Globe },
      { name: 'Make Posts', href: '/tools/posts', icon: FileText },
      { name: 'Virtual Assistant', href: '/tools/assistant', icon: Bot },
    ],
  },
  {
    label: 'Einstellungen',
    items: [
      { name: 'Mein Betrieb', href: '/unternehmen', icon: Building2 },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-lg font-semibold">Hebelki</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.name}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <DevUserSwitcher />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent active:bg-transparent">
              <UserButton afterSignOutUrl="/" />
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">
                  {user?.fullName || user?.firstName || 'User'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user?.primaryEmailAddress?.emailAddress || ''}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
