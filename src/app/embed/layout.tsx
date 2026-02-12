import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import '../globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Hebelki Widget',
  robots: 'noindex, nofollow',
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} antialiased bg-transparent`}
      >
        {children}
      </body>
    </html>
  )
}
