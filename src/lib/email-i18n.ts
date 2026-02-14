import type { Locale } from '@/i18n/config'

type NestedMessages = { [key: string]: string | NestedMessages }

const messageCache: Partial<Record<Locale, NestedMessages>> = {}

async function loadMessages(locale: Locale): Promise<NestedMessages> {
  if (!messageCache[locale]) {
    messageCache[locale] = (await import(`../../messages/${locale}.json`)).default
  }
  return messageCache[locale]!
}

function resolveNamespace(messages: NestedMessages, namespace: string): NestedMessages | string | undefined {
  return namespace.split('.').reduce<NestedMessages | string | undefined>(
    (obj, key) => (typeof obj === 'object' ? obj?.[key] : undefined),
    messages
  )
}

/**
 * Load translations for a given locale and namespace.
 * Works outside React context (emails, chatbot prompts, server-only pages).
 *
 * Usage:
 *   const t = await getEmailTranslations('de', 'emails.confirmationSubject')
 *   t('greeting') // returns the translated string
 */
export async function getEmailTranslations(locale: Locale, namespace: string) {
  const messages = await loadMessages(locale)
  const ns = resolveNamespace(messages, namespace)

  return (key: string, params?: Record<string, string | number>): string => {
    const resolved = typeof ns === 'object' ? ns?.[key] : undefined
    if (typeof resolved !== 'string') return key

    if (!params) return resolved
    return Object.entries(params).reduce<string>(
      (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      resolved
    )
  }
}

/**
 * Load all messages for a given locale (for NextIntlClientProvider override).
 */
export async function getMessagesForLocale(locale: Locale): Promise<NestedMessages> {
  return loadMessages(locale)
}
