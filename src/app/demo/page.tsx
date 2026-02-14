import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'
import { DemoPageClient } from './components/DemoPageClient'

export const metadata = {
  title: 'Demo – Hebelki',
  description: 'Testen Sie Hebelki live — als Kunde oder als Geschäftsinhaber',
}

export default async function DemoPage() {
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

  return <DemoPageClient businesses={demoBusinesses as Array<{
    id: string
    name: string
    slug: string
    type: string
    primaryColor: string | null
    description: string | null
    settings: Record<string, unknown> | null
  }>} />
}
