'use client'

/**
 * GDPR Self-Service Deletion Request Page
 *
 * Public page where customers can request deletion of their data.
 * Accepts email, calls POST /api/gdpr/request-deletion.
 * Supports ?business=<slug> query param to pre-select a business.
 */

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle, Shield, ArrowLeft } from 'lucide-react'

function GdprRequestContent() {
  const searchParams = useSearchParams()
  const businessSlug = searchParams.get('business')

  const [email, setEmail] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(!!businessSlug)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Resolve business slug to ID
  useEffect(() => {
    if (!businessSlug) return

    async function resolveBusiness() {
      try {
        const res = await fetch(`/api/${businessSlug}/config`)
        if (res.ok) {
          const data = await res.json()
          if (data.id) {
            setBusinessId(data.id)
            setBusinessName(data.name)
          }
        }
      } catch {
        // Ignore - user can still enter manually
      } finally {
        setResolving(false)
      }
    }

    resolveBusiness()
  }, [businessSlug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Bitte geben Sie Ihre E-Mail-Adresse ein.')
      return
    }

    if (!businessId.trim()) {
      setError('Unternehmen konnte nicht ermittelt werden. Bitte kontaktieren Sie support@hebelki.de.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/gdpr/request-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), businessId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Ein Fehler ist aufgetreten.')
        return
      }

      setSubmitted(true)
    } catch {
      setError('Ein Netzwerkfehler ist aufgetreten. Bitte versuchen Sie es später erneut.')
    } finally {
      setLoading(false)
    }
  }

  if (resolving) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Laden...</span>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Anfrage gesendet</h1>
          <p className="text-gray-600 mb-4">
            Falls ein Konto mit dieser E-Mail-Adresse existiert, erhalten Sie
            in Kürze eine Bestätigungs-E-Mail mit weiteren Anweisungen.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 text-left">
            <p className="text-sm text-blue-800">
              <strong>So geht es weiter:</strong>
            </p>
            <ol className="text-sm text-blue-700 mt-2 list-decimal ml-4 space-y-1">
              <li>Prüfen Sie Ihren Posteingang (auch Spam-Ordner)</li>
              <li>Klicken Sie auf den Bestätigungslink in der E-Mail</li>
              <li>Optional: Laden Sie Ihre Daten vor der Löschung herunter</li>
              <li>Bestätigen Sie die endgültige Löschung</li>
            </ol>
            <p className="text-sm text-blue-700 mt-2">
              Der Bestätigungslink ist <strong>7 Tage</strong> gültig.
            </p>
          </div>
          <Link
            href="/datenschutz"
            className="inline-flex items-center gap-1 mt-6 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Datenschutzerklärung
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-6">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Datenlöschung beantragen
          </h1>
          {businessName && (
            <p className="text-gray-500 text-sm">bei {businessName}</p>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-600 space-y-2">
          <p>
            Gemäß Art. 17 DSGVO haben Sie das Recht, die Löschung Ihrer
            personenbezogenen Daten zu verlangen.
          </p>
          <p>
            Nach dem Absenden erhalten Sie eine E-Mail mit einem
            Bestätigungslink. Dort können Sie Ihre Daten vor der Löschung
            herunterladen und die Löschung endgültig bestätigen.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              E-Mail-Adresse
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ihre@email.de"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            />
            <p className="mt-1 text-xs text-gray-400">
              Die E-Mail-Adresse, mit der Sie beim Unternehmen registriert sind.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !businessId}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Wird gesendet...
              </>
            ) : (
              'Löschanfrage senden'
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t text-center">
          <Link
            href="/datenschutz"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Datenschutzerklärung
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function GdprRequestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Laden...</span>
        </div>
      </div>
    }>
      <GdprRequestContent />
    </Suspense>
  )
}
