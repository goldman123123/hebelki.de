import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Bot, AlertTriangle, CheckCircle, Users, Shield, MessageSquare } from 'lucide-react'

export const metadata: Metadata = {
  title: 'KI-Nutzungshinweise | Hebelki',
  description: 'Informationen zur Nutzung des KI-Chatbots gemäß EU AI Act',
}

// This version must match the one in the settings page and API
const AI_LITERACY_VERSION = '1.0'

export default function AiUsagePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/settings"
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu Einstellungen
        </Link>

        <div className="rounded-lg border bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Bot className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">KI-Nutzungshinweise</h1>
              <p className="text-sm text-gray-500">Version {AI_LITERACY_VERSION} | EU AI Act Art. 4 & 50</p>
            </div>
          </div>

          {/* What the AI does */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Was der KI-Chatbot kann
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                <span><strong>Terminbuchungen:</strong> Termine anfragen, verfügbare Zeiten prüfen und Buchungen erstellen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                <span><strong>Informationen bereitstellen:</strong> Fragen zu Services, Preisen, Öffnungszeiten und Ablauf beantworten</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                <span><strong>Weiterleitung:</strong> Bei komplexen Anliegen an menschliche Mitarbeiter verweisen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                <span><strong>Mehrsprachigkeit:</strong> Konversationen in Deutsch und Englisch führen</span>
              </li>
            </ul>
          </section>

          {/* Limitations */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Grenzen und Einschränkungen
            </h2>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <ul className="space-y-2 text-amber-800">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                  <span><strong>Keine medizinische Beratung:</strong> Der Chatbot gibt keine Diagnosen oder Behandlungsempfehlungen</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                  <span><strong>Keine rechtliche Beratung:</strong> Für rechtliche Fragen wenden Sie sich an einen Anwalt</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                  <span><strong>Mögliche Fehler:</strong> KI-Systeme können falsche oder ungenaue Informationen liefern</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                  <span><strong>Eingeschränktes Wissen:</strong> Der Chatbot kennt nur die vom Unternehmen bereitgestellten Informationen</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                  <span><strong>Keine Echtzeitdaten:</strong> Aktuelle Verfügbarkeiten können abweichen</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Escalation */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Users className="h-5 w-5 text-blue-500" />
              Eskalation zu menschlichem Support
            </h2>
            <p className="mb-4 text-gray-700">
              Der Chatbot ist so konzipiert, dass er automatisch erkennt, wenn ein menschlicher Mitarbeiter
              benötigt wird. In folgenden Fällen erfolgt eine Weiterleitung:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                <span>Beschwerden oder Reklamationen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                <span>Komplexe oder sensible Anfragen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                <span>Wenn der Kunde ausdrücklich einen Menschen verlangt</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                <span>Bei mehrfachen Verständnisproblemen</span>
              </li>
            </ul>
            <div className="mt-4 rounded-md bg-blue-50 p-4">
              <p className="text-sm text-blue-700">
                <strong>Tipp:</strong> Schreiben Sie einfach &quot;Ich möchte mit einem Mitarbeiter sprechen&quot;
                oder &quot;Bitte rufen Sie mich an&quot;, um sofort an einen Menschen weitergeleitet zu werden.
              </p>
            </div>
          </section>

          {/* Data Handling */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Shield className="h-5 w-5 text-purple-500" />
              Datenverarbeitung
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500" />
                <span><strong>Speicherung:</strong> Chatverläufe werden gemäß der Datenschutzerklärung des Unternehmens gespeichert</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500" />
                <span><strong>Zweck:</strong> Verbesserung des Services und Erfüllung von Buchungsanfragen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500" />
                <span><strong>KI-Verarbeitung:</strong> Nachrichten werden von einem KI-Sprachmodell (DeepSeek) verarbeitet</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500" />
                <span><strong>Löschung:</strong> Daten werden entsprechend der Aufbewahrungsrichtlinie automatisch gelöscht</span>
              </li>
            </ul>
          </section>

          {/* EU AI Act Info */}
          <section className="mb-8 rounded-md border border-gray-200 bg-gray-50 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <MessageSquare className="h-5 w-5 text-gray-600" />
              EU AI Act Compliance
            </h2>
            <p className="mb-4 text-gray-700">
              Dieses KI-System wird gemäß dem EU AI Act (Verordnung (EU) 2024/1689) als <strong>System mit begrenztem Risiko</strong> klassifiziert.
            </p>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <strong>Artikel 4 (KI-Kompetenz):</strong> Betreiber müssen sicherstellen, dass ihr Personal über
                ausreichende KI-Kompetenz verfügt, um KI-Systeme verantwortungsvoll zu nutzen und zu überwachen.
              </p>
              <p>
                <strong>Artikel 50 (Transparenzpflichten):</strong> KI-Systeme, die direkt mit Menschen interagieren,
                müssen so gestaltet sein, dass die natürlichen Personen darüber informiert werden, dass sie mit einem
                KI-System interagieren.
              </p>
            </div>
          </section>

          {/* Roles */}
          <section className="rounded-md border border-blue-200 bg-blue-50 p-6">
            <h3 className="mb-3 font-semibold text-blue-800">Rollen und Verantwortlichkeiten</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <p>
                <strong>Hebelki (Anbieter):</strong> Stellt das KI-System bereit und gewährleistet die technische
                Compliance sowie diese Schulungsmaterialien.
              </p>
              <p>
                <strong>Ihr Unternehmen (Betreiber):</strong> Ist verantwortlich für die ordnungsgemäße Nutzung des
                KI-Systems und die Schulung des eigenen Personals.
              </p>
              <p>
                <strong>Ihre Mitarbeiter (Nutzer):</strong> Müssen über die Funktionsweise, Grenzen und Risiken des
                KI-Systems informiert sein.
              </p>
            </div>
          </section>

          <div className="mt-8 border-t pt-6">
            <p className="text-center text-sm text-gray-500">
              Bei Fragen zur KI-Nutzung wenden Sie sich an{' '}
              <a href="mailto:support@hebelki.de" className="text-primary hover:underline">
                support@hebelki.de
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
