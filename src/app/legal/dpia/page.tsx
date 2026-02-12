import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, FileText, Eye, Lock, RefreshCw } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Datenschutz-Folgenabschätzung (DSFA) | Hebelki',
  description: 'DSFA gemäß Art. 35 DSGVO für den KI-Chatbot zur Terminbuchung und Kundenservice',
}

export default function DpiaPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/datenschutz"
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Datenschutzerklärung
        </Link>

        <div className="rounded-lg border bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Datenschutz-Folgenabschätzung (DSFA)</h1>
              <p className="text-sm text-gray-500">Gemäß Art. 35 DSGVO | Version 1.0</p>
            </div>
          </div>

          {/* 1. System Description */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <FileText className="h-5 w-5 text-blue-500" />
              1. Systembeschreibung
            </h2>
            <p className="mb-4 text-gray-700">
              Hebelki betreibt einen KI-gestützten Chatbot zur Terminbuchung und Kundenservice
              für Geschäftskunden (Multi-Tenant SaaS). Das System verarbeitet personenbezogene
              Daten von Endkunden im Auftrag der jeweiligen Geschäftskunden.
            </p>
            <div className="rounded-md border bg-gray-50 p-4 text-sm text-gray-600 space-y-2">
              <p><strong>System:</strong> KI-Chatbot (OpenRouter / DeepSeek) mit Tool-Calling</p>
              <p><strong>Zweck:</strong> Automatisierte Terminbuchung, FAQ-Beantwortung, Kundenservice</p>
              <p><strong>Kanäle:</strong> Web-Chat, WhatsApp (via Twilio), Telefon (via Twilio + OpenAI)</p>
              <p><strong>Verantwortlicher:</strong> Jeweiliger Geschäftskunde (Auftraggeber)</p>
              <p><strong>Auftragsverarbeiter:</strong> Hebelki (Betreiber der Plattform)</p>
            </div>
          </section>

          {/* 2. Risk Classification */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Eye className="h-5 w-5 text-amber-500" />
              2. Risikoklassifizierung
            </h2>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-800 mb-2">Begrenztes Risiko (Limited Risk)</p>
              <p className="text-sm text-amber-700">
                Gemäß EU AI Act (Verordnung (EU) 2024/1689) wird dieses KI-System als System mit
                begrenztem Risiko klassifiziert. Es unterliegt Transparenzpflichten gemäß Art. 50
                (Offenlegung der KI-Interaktion) und Art. 4 (KI-Kompetenz).
              </p>
            </div>
          </section>

          {/* 3. Data Categories */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <FileText className="h-5 w-5 text-green-500" />
              3. Verarbeitete Datenkategorien
            </h2>
            <div className="space-y-3">
              <div className="rounded-md border p-3">
                <p className="font-medium text-gray-800">Kontaktdaten</p>
                <p className="text-sm text-gray-600">Name, E-Mail-Adresse, Telefonnummer</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="font-medium text-gray-800">Buchungsdaten</p>
                <p className="text-sm text-gray-600">Termine, ausgewählte Dienstleistungen, Mitarbeiterzuordnung</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="font-medium text-gray-800">Chatverlauf</p>
                <p className="text-sm text-gray-600">Nachrichten, KI-Antworten, Tool-Aufrufe, Konversationsmetadaten</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="font-medium text-gray-800">Technische Daten</p>
                <p className="text-sm text-gray-600">IP-Adresse (Rate Limiting), Kanal (Web/WhatsApp), Zeitstempel</p>
              </div>
            </div>
          </section>

          {/* 4. Risk Assessment Matrix */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              4. Risikobewertung
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left font-semibold">Risiko</th>
                    <th className="border p-2 text-center font-semibold">Eintritts&shy;wahrscheinlichkeit</th>
                    <th className="border p-2 text-center font-semibold">Auswirkung</th>
                    <th className="border p-2 text-center font-semibold">Risikostufe</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2">Datenpanne / unbefugter Zugriff auf Kundendaten</td>
                    <td className="border p-2 text-center">Gering</td>
                    <td className="border p-2 text-center">Hoch</td>
                    <td className="border p-2 text-center">
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">Mittel</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-2">Unbefugter Zugriff auf Geschäftsdaten (Tenant-Isolation)</td>
                    <td className="border p-2 text-center">Gering</td>
                    <td className="border p-2 text-center">Hoch</td>
                    <td className="border p-2 text-center">
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">Mittel</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-2">KI-Halluzination (falsche Informationen an Kunden)</td>
                    <td className="border p-2 text-center">Mittel</td>
                    <td className="border p-2 text-center">Mittel</td>
                    <td className="border p-2 text-center">
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">Mittel</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-2">Cross-Tenant-Datenleck (Daten eines Mandanten an anderen)</td>
                    <td className="border p-2 text-center">Sehr gering</td>
                    <td className="border p-2 text-center">Sehr hoch</td>
                    <td className="border p-2 text-center">
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">Mittel</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 5. Mitigations */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Lock className="h-5 w-5 text-green-600" />
              5. Schutzmaßnahmen
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Verschlüsselung:</strong> TLS/SSL für alle Übertragungen, verschlüsselte Datenbank im Ruhezustand, Twilio-Credentials AES-verschlüsselt</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Zugriffskontrolle:</strong> Clerk-Authentifizierung, rollenbasierte Berechtigungen (Owner/Admin/Staff), Business-Member-Prüfung</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Tenant-Isolation:</strong> Alle Datenbankabfragen durch businessId gefiltert, serverseitige businessId-Injektion bei Tool-Aufrufen</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>KI-Transparenz:</strong> Pflicht zur KI-Offenlegung in erster Nachricht, EU AI Act Art. 50 Compliance</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Rate Limiting:</strong> Schutz gegen Missbrauch (10 Nachrichten/Min Chatbot, 5/Min Buchungen)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Datenminimierung:</strong> Konfigurierbare Aufbewahrungsfristen (90-1095 Tage), automatische Löschung</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                <span><strong>Eskalation:</strong> Automatische Weiterleitung an menschliche Mitarbeiter bei Problemen</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>
                  <strong>TOMs:</strong> Technische und organisatorische Maßnahmen dokumentiert{' '}
                  <Link href="/legal/toms" className="text-primary hover:underline">(TOMs ansehen)</Link>
                </span>
              </li>
            </ul>
          </section>

          {/* 6. Residual Risk */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Shield className="h-5 w-5 text-blue-500" />
              6. Restrisikobewertung
            </h2>
            <div className="rounded-md border border-green-200 bg-green-50 p-4">
              <p className="font-semibold text-green-800 mb-2">Akzeptables Restrisiko</p>
              <p className="text-sm text-green-700">
                Nach Implementierung aller oben genannten Schutzmaßnahmen wird das Restrisiko
                als akzeptabel eingestuft. Die Kombination aus Verschlüsselung, Zugriffskontrolle,
                Tenant-Isolation und Transparenzmaßnahmen reduziert die identifizierten Risiken
                auf ein vertretbares Niveau.
              </p>
            </div>
          </section>

          {/* 7. Review Schedule */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <RefreshCw className="h-5 w-5 text-gray-600" />
              7. Überprüfungsplan
            </h2>
            <div className="rounded-md border bg-gray-50 p-4 text-sm text-gray-600 space-y-2">
              <p><strong>Überprüfungszyklus:</strong> Jährlich oder bei wesentlichen Systemänderungen</p>
              <p><strong>Nächste Überprüfung:</strong> Februar 2027</p>
              <p><strong>Verantwortlich:</strong> Datenschutzbeauftragter / Geschäftsführung</p>
              <p><strong>Auslöser für außerplanmäßige Überprüfung:</strong></p>
              <ul className="list-disc ml-4 mt-1 space-y-1">
                <li>Wechsel des KI-Modells oder Anbieters</li>
                <li>Neue Datenkategorien oder Verarbeitungszwecke</li>
                <li>Sicherheitsvorfälle</li>
                <li>Änderungen der Rechtsgrundlage (DSGVO, EU AI Act)</li>
              </ul>
            </div>
          </section>

          {/* Legal References */}
          <section className="rounded-md border border-gray-200 bg-gray-50 p-6">
            <h2 className="mb-3 font-semibold text-gray-800">Rechtsgrundlagen</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Art. 35 DSGVO:</strong> Datenschutz-Folgenabschätzung</p>
              <p><strong>Art. 28 DSGVO:</strong> Auftragsverarbeitung (AVV zwischen Hebelki und Geschäftskunde)</p>
              <p><strong>Art. 32 DSGVO:</strong> Sicherheit der Verarbeitung (TOMs)</p>
              <p><strong>EU AI Act Art. 4:</strong> KI-Kompetenz</p>
              <p><strong>EU AI Act Art. 50:</strong> Transparenzpflichten für KI-Systeme mit begrenztem Risiko</p>
            </div>
          </section>

          <div className="mt-8 border-t pt-6 space-y-2">
            <p className="text-center text-sm text-gray-500">
              Dieses Dokument wird jährlich überprüft und bei Bedarf aktualisiert.
            </p>
            <p className="text-center text-sm text-gray-500">
              Bei Fragen wenden Sie sich an{' '}
              <a href="mailto:privacy@hebelki.de" className="text-primary hover:underline">
                privacy@hebelki.de
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
