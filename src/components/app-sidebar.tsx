'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, useUser } from '@clerk/nextjs'
import { useTranslations } from 'next-intl'
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
  Brain,
  Shield,
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
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  nameKey: string
  href: string
  icon: LucideIcon
}

interface NavGroup {
  labelKey: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    labelKey: 'overview',
    items: [
      { nameKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
      { nameKey: 'bookings', href: '/bookings', icon: Calendar },
      { nameKey: 'calendar', href: '/calendar', icon: CalendarDays },
    ],
  },
  {
    labelKey: 'management',
    items: [
      { nameKey: 'services', href: '/services', icon: Briefcase },
      { nameKey: 'teamScheduling', href: '/team-scheduling', icon: Users },
      { nameKey: 'customers', href: '/customers', icon: UserRound },
    ],
  },
  {
    labelKey: 'communication',
    items: [
      { nameKey: 'chatbotData', href: '/chatbot', icon: MessageSquare },
      { nameKey: 'liveChat', href: '/support-chat', icon: Headphones },
    ],
  },
  {
    labelKey: 'tools',
    items: [
      { nameKey: 'makeWebsite', href: '/tools/website', icon: Globe },
      { nameKey: 'makePosts', href: '/tools/posts', icon: FileText },
      { nameKey: 'virtualAssistant', href: '/tools/assistant', icon: Bot },
    ],
  },
  {
    labelKey: 'settingsGroup',
    items: [
      { nameKey: 'myBusiness', href: '/unternehmen', icon: Building2 },
      { nameKey: 'aiSettings', href: '/ai-settings', icon: Brain },
    ],
  },
]

interface AppSidebarProps {
  isPlatformAdmin?: boolean
}

export function AppSidebar({ isPlatformAdmin = false }: AppSidebarProps) {
  const pathname = usePathname()
  const { user } = useUser()
  const t = useTranslations('dashboard.sidebar')

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
          <SidebarGroup key={group.labelKey}>
            <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.nameKey}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={t(item.nameKey)}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{t(item.nameKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {isPlatformAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('platform')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/platform'}
                    tooltip={t('platform')}
                  >
                    <Link href="/platform">
                      <Shield />
                      <span>{t('platform')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
