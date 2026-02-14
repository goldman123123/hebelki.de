'use client'

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { AppSidebar } from '@/components/app-sidebar'

interface DashboardShellProps {
  children: React.ReactNode
  isPlatformAdmin?: boolean
  banner?: React.ReactNode
}

export function DashboardShell({ children, isPlatformAdmin = false, banner }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar isPlatformAdmin={isPlatformAdmin} />
      <SidebarInset>
        {banner}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 !h-4" />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 md:p-6">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
