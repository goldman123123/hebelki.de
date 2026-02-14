import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { deDE, enUS } from "@clerk/localizations"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages, getTranslations } from "next-intl/server"
import { Toaster } from "sonner"
import { CookieConsentBanner } from "@/components/cookie-consent"
import { headers } from "next/headers"
import type { Locale } from "@/i18n/config"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const CLERK_LOCALIZATIONS: Record<Locale, typeof deDE | typeof enUS> = {
  de: deDE,
  en: enUS,
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  const headerStore = await headers()
  const host = headerStore.get('host') || 'www.hebelki.de'
  const pathname = headerStore.get('x-pathname') || '/'

  const deHost = 'www.hebelki.de'
  const enHost = 'www.book.gy'

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `https://${host}${pathname}`,
      languages: {
        de: `https://${deHost}${pathname}`,
        en: `https://${enHost}${pathname}`,
      },
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale() as Locale
  const messages = await getMessages()

  return (
    <ClerkProvider localization={CLERK_LOCALIZATIONS[locale]}>
      <html lang={locale}>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
          <Toaster position="top-right" />
          <CookieConsentBanner />
        </body>
      </html>
    </ClerkProvider>
  )
}
