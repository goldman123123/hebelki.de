import { getLocale } from 'next-intl/server'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { Locale } from '@/i18n/config'

/**
 * Domain-based UI locale — for dashboard, marketing, admin UI.
 * Reads from next-intl (which reads x-locale header → ui_locale cookie → default).
 */
export async function getUiLocale(): Promise<Locale> {
  const locale = await getLocale()
  return locale as Locale
}

/**
 * DB-based business locale — for customer-facing surfaces
 * (booking widget, chatbot, emails, voice prompts).
 * Reads business.settings.language from DB, defaults to 'de'.
 */
export async function getBusinessLocale(businessId: string): Promise<Locale> {
  const [business] = await db
    .select({ settings: businesses.settings })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1)

  const settings = business?.settings as Record<string, unknown> | null
  const language = settings?.language as string | undefined

  if (language === 'en') return 'en'
  return 'de'
}
