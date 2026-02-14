import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { type Locale, defaultLocale, locales } from './config'

export default getRequestConfig(async () => {
  // Fallback chain: x-locale header → ui_locale cookie → default
  const headerStore = await headers()
  const cookieStore = await cookies()

  const headerLocale = headerStore.get('x-locale')
  const cookieLocale = cookieStore.get('ui_locale')?.value

  let locale: Locale = defaultLocale

  if (headerLocale && locales.includes(headerLocale as Locale)) {
    locale = headerLocale as Locale
  } else if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
