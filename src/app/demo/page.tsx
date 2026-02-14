import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { SignOutButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Calendar, LogOut } from 'lucide-react'
import { DevUserSwitcherPublic } from '@/components/DevUserSwitcherPublic'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'
import { DemoPageClient } from './components/DemoPageClient'

export const metadata = {
  title: 'Demo – Hebelki',
  description: 'Testen Sie Hebelki live — als Kunde oder als Geschäftsinhaber',
}

export default async function DemoPage() {
  const { userId } = await auth()
  const isLoggedIn = !!userId

  const demoBusinesses = await db.select({
    id: businesses.id,
    name: businesses.name,
    slug: businesses.slug,
    type: businesses.type,
    primaryColor: businesses.primaryColor,
    description: businesses.description,
    settings: businesses.settings,
  }).from(businesses)
    .where(sql`${businesses.settings}->>'isDemo' = 'true'`)
    .orderBy(businesses.name)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header — same as frontpage */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Hebelki</span>
          </Link>
          <div className="flex items-center gap-4">
            <DevUserSwitcherPublic />
            <Link href="/demo" className="text-sm font-medium text-gray-900 hidden sm:block">
              Demo
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Preise
            </Link>
            {isLoggedIn ? (
              <>
                <Link href="/dashboard">
                  <Button>Dashboard</Button>
                </Link>
                <SignOutButton>
                  <Button variant="ghost" size="sm">
                    <LogOut className="h-4 w-4 mr-2" />
                    Abmelden
                  </Button>
                </SignOutButton>
              </>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost">Anmelden</Button>
                </Link>
                <Link href="/sign-up">
                  <Button>Jetzt starten</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <DemoPageClient businesses={demoBusinesses as Array<{
        id: string
        name: string
        slug: string
        type: string
        primaryColor: string | null
        description: string | null
        settings: Record<string, unknown> | null
      }>} />
    </div>
  )
}
