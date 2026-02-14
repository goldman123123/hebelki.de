'use client'

import { NextIntlClientProvider } from 'next-intl'

interface BusinessLocaleProviderProps {
  locale: string
  messages: Record<string, unknown>
  children: React.ReactNode
}

/**
 * Wraps children with business-locale messages, overriding the domain-based
 * locale from the root layout. Used for customer-facing pages (booking, chat)
 * where the language is determined by business.settings.language.
 */
export function BusinessLocaleProvider({ locale, messages, children }: BusinessLocaleProviderProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
