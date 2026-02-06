/**
 * Terms of Service Page
 *
 * Legal documentation for Hebelki platform use
 * Includes AI chatbot disclaimers and liability information
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nutzungsbedingungen - Hebelki',
  description: 'Nutzungsbedingungen für die Hebelki Buchungsplattform',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Nutzungsbedingungen
            </h1>
            <p className="text-sm text-gray-500">
              Letzte Aktualisierung: {new Date().toLocaleDateString('de-DE')}
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              1. Überblick
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Hebelki ist eine Multi-Tenant-Buchungsplattform, die Unternehmen eine
              KI-gestützte Chatbot-Funktionalität zur Verfügung stellt. Durch die Nutzung
              dieser Plattform stimmen Sie den folgenden Bedingungen zu.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              2. KI-gestützter Chatbot - Wichtige Hinweise
            </h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                ⚠️ Wichtiger Hinweis zur KI-Nutzung
              </p>
              <p className="text-sm text-yellow-700">
                Hebelki nutzt künstliche Intelligenz (KI) zur Automatisierung von
                Kundeninteraktionen. Durch die Nutzung dieser Plattform erkennen Sie an:
              </p>
            </div>

            <ul className="list-disc ml-6 space-y-2 text-gray-700">
              <li>
                <strong>Automatisierte Antworten:</strong> Der Chatbot kann ungenaue oder
                unvollständige Informationen liefern. KI-Systeme sind nicht fehlerfrei.
              </li>
              <li>
                <strong>Verifizierungspflicht:</strong> Sie sind verpflichtet, alle
                KI-generierten Antworten zu überprüfen, bevor Sie darauf basierend
                handeln.
              </li>
              <li>
                <strong>Haftung:</strong> Sie bleiben verantwortlich für alle
                Buchungsbestätigungen, Kundeninteraktionen und Serviceleistungen.
              </li>
              <li>
                <strong>Überwachungspflicht:</strong> Sie müssen KI-Entscheidungen
                regelmäßig überwachen und bei Bedarf eingreifen.
              </li>
              <li>
                <strong>Keine medizinischen Garantien:</strong> Der Chatbot darf keine
                medizinischen Diagnosen stellen oder Behandlungsgarantien geben.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              3. Datenverarbeitung & Speicherung
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Kundengespräche werden zur Verbesserung des Services bis zu 90 Tage lang
              gespeichert. Sie können jederzeit die Löschung von Gesprächsdaten
              beantragen. Weitere Informationen finden Sie in unserer{' '}
              <a href="/datenschutz" className="text-blue-600 hover:underline">
                Datenschutzerklärung
              </a>
              .
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              4. Drittanbieter-KI-Dienste
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Wir nutzen OpenRouter und Google Gemini für die KI-Verarbeitung. Ihre
              Daten können gemäß deren Datenschutzrichtlinien verarbeitet werden:
            </p>
            <ul className="list-disc ml-6 space-y-1 text-gray-700">
              <li>
                <a
                  href="https://openrouter.ai/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  OpenRouter Datenschutzrichtlinie
                </a>
              </li>
              <li>
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google Datenschutzrichtlinie
                </a>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              5. WhatsApp-Integration (optional)
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Wenn Sie WhatsApp-Benachrichtigungen aktivieren:
            </p>
            <ul className="list-disc ml-6 space-y-1 text-gray-700">
              <li>Kunden müssen explizit zustimmen (Opt-in)</li>
              <li>Kunden können jederzeit mit "STOP" abmelden (Opt-out)</li>
              <li>
                Nachrichten werden über Twilio gesendet (
                <a
                  href="https://www.twilio.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Twilio Datenschutz
                </a>
                )
              </li>
              <li>
                Meta/WhatsApp Richtlinien gelten (
                <a
                  href="https://www.whatsapp.com/legal/business-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  WhatsApp Business Policy
                </a>
                )
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              6. Haftungsausschluss
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Hebelki übernimmt keine Haftung für:
            </p>
            <ul className="list-disc ml-6 space-y-1 text-gray-700">
              <li>Fehlerhafte oder ungenaue KI-generierte Antworten</li>
              <li>
                Verlorene Buchungen aufgrund von System- oder KI-Fehlern
              </li>
              <li>Datenverlust durch Drittanbieter-Dienste</li>
              <li>Verstöße gegen Datenschutzgesetze durch Ihre Nutzung</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              7. EU AI Act Compliance
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Unsere KI-Chatbot-Systeme fallen unter die Kategorie "Limited Risk AI"
              gemäß EU AI Act. Wir verpflichten uns zu:
            </p>
            <ul className="list-disc ml-6 space-y-1 text-gray-700">
              <li>Transparenz: Kunden werden über KI-Nutzung informiert</li>
              <li>
                Menschliche Aufsicht: Sie können jederzeit den Chatbot deaktivieren
              </li>
              <li>
                Nachvollziehbarkeit: KI-Entscheidungen werden protokolliert
              </li>
              <li>Datenschutz: DSGVO-konforme Datenverarbeitung</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              8. Änderungen der Nutzungsbedingungen
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Wir behalten uns das Recht vor, diese Nutzungsbedingungen jederzeit zu
              ändern. Wesentliche Änderungen werden Ihnen per E-Mail mitgeteilt.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              9. Kontakt
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Bei Fragen zu diesen Nutzungsbedingungen kontaktieren Sie uns bitte unter:{' '}
              <a
                href="mailto:support@hebelki.de"
                className="text-blue-600 hover:underline"
              >
                support@hebelki.de
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
