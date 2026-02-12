/**
 * Privacy Policy Page
 *
 * GDPR-compliant privacy documentation
 * Covers AI chatbot data processing and user rights
 */

import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung - Hebelki',
  description: 'Datenschutzerklärung für die Hebelki Buchungsplattform',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Datenschutzerklärung
            </h1>
            <p className="text-sm text-gray-500">
              Letzte Aktualisierung: {new Date().toLocaleDateString('de-DE')}
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              1. Verantwortlicher
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Verantwortlich für die Datenverarbeitung auf dieser Website:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium">Hebelki</p>
              <p className="text-sm text-gray-600">E-Mail: support@hebelki.de</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              2. Welche Daten sammeln wir?
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Wir sammeln folgende Daten:
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-4">
              2.1 Chatbot-Daten
            </h3>
            <ul className="list-disc ml-6 space-y-2 text-gray-700">
              <li>
                <strong>Nachrichten:</strong> An den Chatbot gesendete Kundennachrichten
              </li>
              <li>
                <strong>Kontaktdaten:</strong> Telefonnummern und E-Mail-Adressen
                (sofern angegeben)
              </li>
              <li>
                <strong>Gesprächsmetadaten:</strong> Zeitstempel, Kanal (Web/WhatsApp),
                Unternehmens-ID
              </li>
              <li>
                <strong>KI-Antworten:</strong> Vom KI-Modell generierte Antworten
              </li>
              <li>
                <strong>Tool-Nutzung:</strong> Welche Tools (z.B. Verfügbarkeitsprüfung,
                Buchungserstellung) verwendet wurden
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-4">
              2.2 Buchungsdaten
            </h3>
            <ul className="list-disc ml-6 space-y-2 text-gray-700">
              <li>Name, E-Mail, Telefonnummer</li>
              <li>Buchungstermine und ausgewählte Dienstleistungen</li>
              <li>Zahlungsinformationen (falls zutreffend)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-4">
              2.3 Technische Daten
            </h3>
            <ul className="list-disc ml-6 space-y-2 text-gray-700">
              <li>IP-Adresse (anonymisiert)</li>
              <li>Browser-Typ und -Version</li>
              <li>Zugriffszeitpunkt</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              3. Wie verwenden wir Ihre Daten?
            </h2>
            <ul className="list-disc ml-6 space-y-2 text-gray-700">
              <li>
                <strong>Chatbot-Service:</strong> Zur Beantwortung von Anfragen und
                Buchungsverwaltung
              </li>
              <li>
                <strong>KI-Training:</strong> Zur Verbesserung der KI-Genauigkeit
                (anonymisiert)
              </li>
              <li>
                <strong>Kundensupport:</strong> Bei Problemen oder Anfragen
              </li>
              <li>
                <strong>Rechtliche Verpflichtungen:</strong> Zur Erfüllung gesetzlicher
                Anforderungen
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              4. Datenspeicherung & Aufbewahrung
            </h2>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="text-sm font-medium text-blue-800 mb-2">
                📅 Speicherdauer
              </p>
              <p className="text-sm text-blue-700">
                Chatbot-Gespräche werden standardmäßig 90 Tage nach der letzten
                Aktualisierung automatisch gelöscht. Sie können eine frühere Löschung
                beantragen.
              </p>
            </div>

            <p className="text-gray-700 leading-relaxed mt-4">
              Andere Daten werden gespeichert, bis:
            </p>
            <ul className="list-disc ml-6 space-y-1 text-gray-700">
              <li>Sie eine Löschung beantragen (Recht auf Vergessenwerden)</li>
              <li>Der Speicherzweck entfällt</li>
              <li>Gesetzliche Aufbewahrungsfristen ablaufen</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              5. Datenstandort & Drittanbieter
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Ihre Daten können in folgenden Regionen verarbeitet werden:
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mt-4">
              5.1 Datenbanken
            </h3>
            <ul className="list-disc ml-6 space-y-2 text-gray-700">
              <li>
                <strong>Neon PostgreSQL:</strong> EU-Region (Frankfurt) oder US-Region
                (je nach Konfiguration)
              </li>
              <li>Verschlüsselte Speicherung im Ruhezustand und bei Übertragung</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-4">
              5.2 KI-Verarbeitung
            </h3>
            <ul className="list-disc ml-6 space-y-2 text-gray-700">
              <li>
                <strong>OpenRouter:</strong> KI-Gateway für Modellzugriff (USA)
              </li>
              <li>
                <strong>Google Gemini:</strong> KI-Modell für Textverarbeitung (USA)
              </li>
              <li>
                Daten können in den USA verarbeitet werden (Standard Contractual
                Clauses gemäß DSGVO Art. 46)
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-4">
              5.3 Messaging-Dienste (optional)
            </h3>
            <ul className="list-disc ml-6 space-y-2 text-gray-700">
              <li>
                <strong>Twilio:</strong> WhatsApp-Nachrichten (USA, DSGVO-konform)
              </li>
              <li>
                <strong>Meta/WhatsApp:</strong> Messaging-Plattform (USA/Irland)
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              6. Ihre Rechte (DSGVO)
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Sie haben folgende Rechte:
            </p>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">
                  📋 Recht auf Auskunft
                </h4>
                <p className="text-sm text-gray-600">
                  Sie können Informationen über gespeicherte Daten anfordern
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">
                  ✏️ Recht auf Berichtigung
                </h4>
                <p className="text-sm text-gray-600">
                  Fehlerhafte Daten können korrigiert werden
                </p>
              </div>
              <Link
                href="/gdpr/request"
                className="block border rounded-lg p-4 hover:border-red-400 hover:bg-red-50 transition-colors"
              >
                <h4 className="font-semibold text-gray-800 mb-2">
                  🗑️ Recht auf Löschung
                </h4>
                <p className="text-sm text-gray-600">
                  Sie können die Löschung Ihrer Daten verlangen
                </p>
                <p className="text-xs text-blue-600 mt-1 font-medium">
                  Löschanfrage stellen →
                </p>
              </Link>
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">
                  📤 Recht auf Datenportabilität
                </h4>
                <p className="text-sm text-gray-600">
                  Export Ihrer Gesprächshistorie möglich
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">
                  🚫 Recht auf Widerspruch
                </h4>
                <p className="text-sm text-gray-600">
                  Sie können der Datenverarbeitung widersprechen
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">
                  ⏸️ Recht auf Einschränkung
                </h4>
                <p className="text-sm text-gray-600">
                  Verarbeitung kann eingeschränkt werden
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              7. WhatsApp Opt-In & Opt-Out
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Wenn Sie WhatsApp-Benachrichtigungen erhalten:
            </p>
            <ul className="list-disc ml-6 space-y-2 text-gray-700">
              <li>
                <strong>Opt-In:</strong> Durch das Senden Ihrer ersten Nachricht stimmen
                Sie automatisch zu
              </li>
              <li>
                <strong>Opt-Out:</strong> Antworten Sie mit "STOP", um keine weiteren
                Nachrichten zu erhalten
              </li>
              <li>
                <strong>Opt-In erneut:</strong> Antworten Sie mit "START", um sich
                erneut anzumelden
              </li>
              <li>
                Wir speichern Ihren Opt-In/Opt-Out-Status und Zeitstempel zur
                Compliance-Nachverfolgung
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              8. Cookies & Tracking
            </h2>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="text-sm font-medium text-blue-800 mb-2">
                🍪 Cookie-Einstellungen
              </p>
              <p className="text-sm text-blue-700">
                Beim ersten Besuch erscheint ein Cookie-Banner, in dem Sie Ihre
                Präferenzen auswählen können. Sie können Ihre Einstellungen jederzeit
                über den Banner oder in Ihren Browser-Einstellungen ändern.
              </p>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mt-4">
              8.1 Notwendige Cookies (immer aktiv)
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Diese Cookies sind für die Funktion der Website erforderlich und können
              nicht deaktiviert werden:
            </p>
            <ul className="list-disc ml-6 space-y-2 text-gray-700">
              <li>
                <strong>__session (Clerk):</strong> Authentifizierungs-Cookie für
                Anmeldung und Sitzungsverwaltung
              </li>
              <li>
                <strong>cc_cookie (Hebelki):</strong> Speichert Ihre
                Cookie-Einstellungen (6 Monate)
              </li>
              <li>
                <strong>Funktionale Cookies:</strong> Für Chatbot-Persistenz und
                Konversationsverlauf
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-4">
              8.2 Analyse-Cookies (opt-in erforderlich)
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Diese Cookies helfen uns zu verstehen, wie Besucher mit der Website
              interagieren (derzeit nicht implementiert):
            </p>
            <ul className="list-disc ml-6 space-y-1 text-gray-700">
              <li>
                <strong>Google Analytics:</strong> _ga, _gid (falls Sie zustimmen)
              </li>
              <li>Anonyme Nutzungsstatistiken und Seitenaufrufe</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-4">
              8.3 Marketing-Cookies (opt-in erforderlich)
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Derzeit verwenden wir keine Marketing- oder Tracking-Cookies. Sollten wir
              diese in Zukunft nutzen, werden Sie um Ihre Zustimmung gebeten.
            </p>

            <p className="text-sm text-gray-600 mt-4">
              <strong>Cookie-Verwaltung:</strong> Sie können Cookies jederzeit in Ihren
              Browser-Einstellungen löschen oder blockieren. Beachten Sie, dass dies die
              Funktionalität der Website beeinträchtigen kann.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              9. Sicherheitsmaßnahmen
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Wir schützen Ihre Daten durch:
            </p>
            <ul className="list-disc ml-6 space-y-1 text-gray-700">
              <li>TLS/SSL-Verschlüsselung für alle Übertragungen</li>
              <li>Verschlüsselte Datenbanken im Ruhezustand</li>
              <li>Zugriffskontrolle und Authentifizierung (Clerk Auth)</li>
              <li>Regelmäßige Sicherheitsüberprüfungen</li>
              <li>Minimierung der Datenspeicherung (90-Tage-Limit)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              10. Auftragsverarbeitung (für Geschäftskunden)
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Wenn Sie Hebelki als Unternehmen nutzen, verarbeiten wir personenbezogene
              Daten Ihrer Kunden in Ihrem Auftrag. Hierfür stellen wir folgende Dokumente
              gemäß DSGVO Art. 28 bereit:
            </p>
            <div className="grid gap-3 md:grid-cols-2 mt-4">
              <Link
                href="/legal/avv"
                className="block rounded-lg border p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <h3 className="font-semibold text-gray-800">Auftragsverarbeitungsvertrag</h3>
                <p className="text-sm text-gray-600 mt-1">
                  AVV gemäß Art. 28 DSGVO
                </p>
              </Link>
              <Link
                href="/legal/unterauftragsverarbeiter"
                className="block rounded-lg border p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <h3 className="font-semibold text-gray-800">Unterauftragsverarbeiter</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Liste aller eingesetzten Dienstleister
                </p>
              </Link>
              <Link
                href="/legal/toms"
                className="block rounded-lg border p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <h3 className="font-semibold text-gray-800">TOMs</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Technische und organisatorische Maßnahmen
                </p>
              </Link>
              <Link
                href="/legal/dpia"
                className="block rounded-lg border p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <h3 className="font-semibold text-gray-800">DSFA</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Datenschutz-Folgenabschätzung gemäß Art. 35 DSGVO
                </p>
              </Link>
              <Link
                href="/legal/tia"
                className="block rounded-lg border p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <h3 className="font-semibold text-gray-800">TIA</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Transfer Impact Assessment für Drittlandübermittlungen
                </p>
              </Link>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              11. Änderungen dieser Datenschutzerklärung
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Wir können diese Datenschutzerklärung aktualisieren, um Änderungen unserer
              Praktiken widerzuspiegeln. Wesentliche Änderungen werden per E-Mail
              mitgeteilt.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              12. Kontakt & Beschwerden
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Für Datenschutzanfragen kontaktieren Sie uns:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm">
                <strong>E-Mail:</strong>{' '}
                <a
                  href="mailto:privacy@hebelki.de"
                  className="text-blue-600 hover:underline"
                >
                  privacy@hebelki.de
                </a>
              </p>
              <p className="text-sm">
                <strong>Betreff:</strong> DSGVO-Anfrage - [Ihr Anliegen]
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed mt-4">
              Sie haben auch das Recht, eine Beschwerde bei einer Datenschutzbehörde
              einzureichen:
            </p>
            <p className="text-sm text-gray-600">
              Bundesbeauftragter für den Datenschutz und die Informationsfreiheit (BfDI)
              <br />
              Graurheindorfer Str. 153, 53117 Bonn
              <br />
              Website:{' '}
              <a
                href="https://www.bfdi.bund.de"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                www.bfdi.bund.de
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
