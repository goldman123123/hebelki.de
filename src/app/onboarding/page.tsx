import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getBusinessForUser } from '@/lib/auth'
import Link from 'next/link'
import { Sparkles, Zap } from 'lucide-react'

export default async function OnboardingPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // If user already has a business, redirect to dashboard
  const business = await getBusinessForUser(userId)
  if (business) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900">Willkommen bei Hebelki</h1>
          <p className="mt-3 text-lg text-gray-600">
            Wählen Sie, wie Sie Ihr Unternehmen einrichten möchten
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Guided Wizard */}
          <Link
            href="/onboarding/wizard"
            className="group relative overflow-hidden rounded-xl border-2 border-blue-200 bg-white p-8 shadow-sm transition-all hover:border-blue-400 hover:shadow-xl"
          >
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                Empfohlen
              </span>
            </div>

            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                <Sparkles className="w-8 h-8" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Geführter Einrichtungsassistent
            </h2>

            <p className="text-gray-600 mb-6">
              Schritt-für-Schritt-Assistent, der Ihr Unternehmen automatisch mit KI-gestütztem Website-Scanning einrichtet.
            </p>

            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="mr-2 text-green-600">✓</span>
                <span>Automatisches Scannen Ihrer Website nach Wissen und Dienstleistungen</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-green-600">✓</span>
                <span>KI-gestützte Inhaltsextraktion mit DeepSeek</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-green-600">✓</span>
                <span>Chatbot-Wissensdatenbank wird automatisch befüllt</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-green-600">✓</span>
                <span>Automatische Dienstleistungserkennung und Einrichtungshilfe</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-green-600">✓</span>
                <span>Schnelle Kalender- und Verfügbarkeitseinrichtung</span>
              </li>
            </ul>

            <div className="mt-6 flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
              Geführte Einrichtung starten →
            </div>
          </Link>

          {/* Quick Setup */}
          <Link
            href="/onboarding/simple"
            className="group relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-8 shadow-sm transition-all hover:border-gray-400 hover:shadow-lg"
          >
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-600 group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Schnelleinrichtung
            </h2>

            <p className="text-gray-600 mb-6">
              Einfaches Formular für einen schnellen Start. Sie können alles später im Dashboard konfigurieren.
            </p>

            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="mr-2 text-gray-400">•</span>
                <span>Nur grundlegende Unternehmensinformationen</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-gray-400">•</span>
                <span>Manuelle Einrichtung für Dienstleistungen und Chatbot erforderlich</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-gray-400">•</span>
                <span>Dauert 1-2 Minuten</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-gray-400">•</span>
                <span>Ideal, wenn Sie alles selbst konfigurieren möchten</span>
              </li>
            </ul>

            <div className="mt-6 flex items-center text-gray-600 font-semibold group-hover:translate-x-2 transition-transform">
              Schnelleinrichtung →
            </div>
          </Link>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Sie können Ihre Einrichtung jederzeit später im Dashboard ändern oder vervollständigen
        </p>
      </div>
    </div>
  )
}
