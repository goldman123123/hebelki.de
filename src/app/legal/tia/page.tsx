import { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle,
  Globe,
  Lock,
  Server,
  Database,
  MessageSquare,
  Cpu,
  Scale,
  Info,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Transfer Impact Assessments (TIA) | Hebelki',
  description: 'Dokumentation der Transferfolgenabschätzungen für Datenübermittlungen in Drittländer gemäß Schrems II',
}

// TIA version - bump when assessments are updated
export const TIA_VERSION = '2.0'
export const TIA_DATE = '2026-02-07'

interface TransferAssessment {
  provider: string
  icon: React.ComponentType<{ className?: string }>
  country: string
  purpose: string
  dataCategories: string[]
  legalMechanism: string
  riskLevel: 'low' | 'medium'
  safeguards: string[]
  additionalNotes?: string[]
}

const transfers: TransferAssessment[] = [
  {
    provider: 'Neon',
    icon: Database,
    country: 'USA (AWS)',
    purpose: 'Bereitstellung von PostgreSQL-Datenbankdiensten für die SaaS-Plattform',
    dataCategories: [
      'Geschäftsdaten der Kunden',
      'Kontaktdaten der Endkunden (Name, E-Mail, Telefon)',
      'Buchungsdaten und Termine',
      'Technische Metadaten (Zeitstempel, IDs)',
    ],
    legalMechanism: 'SCCs (Modul 3: Processor → Processor, Art. 28 Abs. 4 DSGVO)',
    riskLevel: 'low',
    safeguards: [
      'Verschlüsselung at-rest (AES-256)',
      'TLS 1.3 für alle Übertragungen',
      'SOC 2 Type II Zertifizierung',
      'Logische Mandantentrennung',
      'Automatische Backups mit Point-in-Time Recovery',
      'Kein routinemäßiger Zugriff auf Kundeninhalte; Zugriff nur im Rahmen von Wartung und Incident-Response unter strengen Zugriffskontrollen',
    ],
  },
  {
    provider: 'OpenRouter',
    icon: Cpu,
    country: 'USA',
    purpose: 'KI/LLM-API-Gateway für Chatbot-Verarbeitung',
    dataCategories: [
      'Chat-Nachrichten (Kundenanfragen)',
      'Konversationskontext',
      'Keine persistente Speicherung (Zero Data Retention)',
    ],
    legalMechanism: 'SCCs (Modul 3: Processor → Processor, Art. 28 Abs. 4 DSGVO)',
    riskLevel: 'medium',
    safeguards: [
      'Zero Data Retention (ZDR) Policy aktiviert',
      'Keine Speicherung von Prompts oder Antworten',
      'TLS-Verschlüsselung für alle API-Aufrufe',
      'Enterprise SCCs verfügbar',
      'Modellauswahl durch Hebelki kontrolliert',
      'Keine Nutzung für KI-Training',
    ],
    additionalNotes: [
      'OpenRouter fungiert als API-Gateway. Je nach Modellauswahl werden weitere Unterauftragsverarbeiter (z.B. Anthropic, Google) eingebunden, die jeweils eigenen technischen und organisatorischen Maßnahmen unterliegen.',
      'Diese Anbieter sind in der Unterauftragsverarbeiterliste aufgeführt und vertraglich durch SCCs bzw. gleichwertige Garantien eingebunden.',
    ],
  },
  {
    provider: 'Twilio',
    icon: MessageSquare,
    country: 'USA',
    purpose: 'WhatsApp- und SMS-Messaging-Dienste',
    dataCategories: [
      'Telefonnummern der Endkunden',
      'Nachrichteninhalte',
      'Zustellungsmetadaten',
      'Opt-In/Opt-Out-Status',
    ],
    legalMechanism: 'SCCs (Modul 3: Processor → Processor, Art. 28 Abs. 4 DSGVO)',
    riskLevel: 'low',
    safeguards: [
      'SOC 2 Type II und ISO 27001 zertifiziert',
      'HIPAA-fähige Infrastruktur',
      'Nachrichtenprotokolle konfigurierbar (Aufbewahrung)',
      'TLS für alle API-Verbindungen',
      'Regionale Datenverarbeitung möglich',
      'Processor-Rolle standardmäßig',
    ],
  },
  {
    provider: 'Vercel',
    icon: Globe,
    country: 'USA / Global (Edge)',
    purpose: 'App-Hosting und Edge-Funktionen für die Webanwendung',
    dataCategories: [
      'HTTP-Anfragen und -Antworten',
      'Session-Daten (verschlüsselt)',
      'Technische Logs (IP-Adressen werden ausschließlich in gekürzter oder pseudonymisierter Form verarbeitet, soweit technisch konfiguriert)',
      'Keine persistente Kundendatenspeicherung',
    ],
    legalMechanism: 'SCCs (Modul 3: Processor → Processor, Art. 28 Abs. 4 DSGVO)',
    riskLevel: 'low',
    safeguards: [
      'SOC 2 Type II zertifiziert',
      'Automatisches SSL/TLS',
      'DDoS-Schutz inklusive',
      'Edge-Funktionen mit minimaler Latenz',
      'Logs automatisch rotiert und gelöscht',
      'Keine langfristige Datenspeicherung',
    ],
  },
  {
    provider: 'Fly.io',
    icon: Server,
    country: 'USA / EU (Region wählbar)',
    purpose: 'Worker-Services für Hintergrundaufgaben (n8n Workflows)',
    dataCategories: [
      'Workflow-Ausführungsdaten',
      'Webhook-Payloads',
      'Temporäre Verarbeitungsdaten',
    ],
    legalMechanism: 'SCCs (Modul 3: Processor → Processor, Art. 28 Abs. 4 DSGVO)',
    riskLevel: 'low',
    safeguards: [
      'Übermittlungen erfolgen auf Basis von SCCs; EU-Regionen werden bevorzugt genutzt, um Drittlandübermittlungen zu minimieren',
      'Container-Isolation',
      'Verschlüsselte Volumes',
      'Keine langfristige Datenspeicherung',
      'Automatische Container-Bereinigung',
    ],
  },
]

export default function TIAPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <Link
          href="/legal/unterauftragsverarbeiter"
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Unterauftragsverarbeiter-Liste
        </Link>

        <div className="rounded-lg border bg-white p-8 shadow-sm">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                <Scale className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Transfer Impact Assessments (TIA)
                </h1>
                <p className="text-sm text-gray-500">
                  Transferfolgenabschätzungen gemäß Schrems II | Stand: {TIA_DATE} | Version {TIA_VERSION}
                </p>
              </div>
            </div>
          </div>

          {/* Introduction */}
          <section className="mb-8 rounded-md border border-amber-200 bg-amber-50 p-6">
            <h2 className="mb-3 font-semibold text-amber-800">Was ist eine TIA?</h2>
            <p className="text-sm text-amber-700">
              Eine Transfer Impact Assessment (TIA) dokumentiert die Bewertung von Datenübermittlungen
              in Drittländer außerhalb des EWR. Sie beantwortet die Frage: <em>&quot;Können die Rechte
              der betroffenen Personen bei dieser Übermittlung wirksam geschützt werden?&quot;</em>
            </p>
            <p className="mt-3 text-sm text-amber-700">
              Diese Bewertung ist erforderlich für Übermittlungen auf Basis von Standardvertragsklauseln (SCCs)
              gemäß der Schrems II-Entscheidung des EuGH (C-311/18).
            </p>
          </section>

          {/* Global Context: Sub-Processing Chain */}
          <section className="mb-8 rounded-md border border-blue-200 bg-blue-50 p-6">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-blue-800">
              <Info className="h-5 w-5" />
              Kontext: Unterauftragsverarbeitungskette
            </h2>
            <p className="text-sm text-blue-700">
              Die Übermittlungen erfolgen im Rahmen von Unterauftragsverarbeitungen gemäß Art. 28 Abs. 4 DSGVO.
              Die Verarbeitungskette ist:
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded bg-blue-100 px-2 py-1 font-medium text-blue-800">Kunde (Verantwortlicher)</span>
              <span className="text-blue-400">→</span>
              <span className="rounded bg-blue-100 px-2 py-1 font-medium text-blue-800">Hebelki (Auftragsverarbeiter)</span>
              <span className="text-blue-400">→</span>
              <span className="rounded bg-blue-100 px-2 py-1 font-medium text-blue-800">Dienstanbieter (Unterauftragsverarbeiter)</span>
            </div>
            <p className="mt-3 text-sm text-blue-700">
              Alle nachfolgenden Übermittlungen nutzen daher <strong>SCC Modul 3 (Processor → Processor)</strong>.
            </p>
          </section>

          {/* Scope */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Anwendungsbereich</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                <h3 className="mb-2 flex items-center gap-2 font-semibold text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  TIA erforderlich
                </h3>
                <ul className="space-y-1 text-sm text-amber-700">
                  <li>• Neon (USA)</li>
                  <li>• OpenRouter (USA)</li>
                  <li>• Twilio (USA)</li>
                  <li>• Vercel (USA/Global)</li>
                  <li>• Fly.io (USA/EU)</li>
                </ul>
              </div>
              <div className="rounded-md border border-green-200 bg-green-50 p-4">
                <h3 className="mb-2 flex items-center gap-2 font-semibold text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  Keine eigenständige TIA erforderlich (DPF-basierte Übermittlung)
                </h3>
                <ul className="space-y-1 text-sm text-green-700">
                  <li>• Clerk (EU-US DPF zertifiziert)</li>
                  <li>• Cloudflare R2 (EU-US DPF + EU-Option)</li>
                  <li>• SMTP Server (EU, selbst gehostet)</li>
                </ul>
                <p className="mt-3 text-xs text-green-600 leading-relaxed">
                  Die Anbieter sind nach dem EU-US Data Privacy Framework zertifiziert; eine vertiefte
                  Schrems-II-Risikoprüfung ist daher nicht erforderlich, wird jedoch im Rahmen des
                  allgemeinen Risikomanagements berücksichtigt.
                </p>
              </div>
            </div>
          </section>

          {/* Global Statements */}
          <section className="mb-8 rounded-md border border-gray-200 bg-gray-50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Übergreifende Grundsätze</h2>
            <div className="space-y-4 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold">Datenminimierung (Art. 5 Abs. 1 lit. c DSGVO)</p>
                  <p className="text-gray-600">
                    Es werden ausschließlich die für den jeweiligen Zweck erforderlichen Daten
                    übermittelt. Personenbezogene Daten werden nur in dem Umfang verarbeitet,
                    der für die Erbringung der jeweiligen Dienstleistung notwendig ist.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold">Kundenwahlmöglichkeit</p>
                  <p className="text-gray-600">
                    Kunden können bestimmte Drittanbieter-Integrationen (z.B. KI-Funktionen)
                    deaktivieren und so die Übermittlung personenbezogener Daten an diese
                    Anbieter vermeiden. Die entsprechenden Einstellungen sind im Dashboard verfügbar.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold">Verschlüsselungskontrolle</p>
                  <p className="text-gray-600">
                    Verschlüsselungsschlüssel für die Datenbank werden nicht durch US-Behörden kontrolliert
                    und liegen außerhalb des direkten Zugriffs der Dienstanbieter. Die Entschlüsselung
                    erfolgt ausschließlich im Rahmen der autorisierten Datenverarbeitung.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 1: Transfer Description */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
              <FileText className="h-5 w-5" />
              1. Beschreibung der Übermittlungen
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Datenexporteur</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Datenimporteur</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Land</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Rechtsmechanismus</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transfers.map((transfer, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">Hebelki (Auftragsverarbeiter)</td>
                      <td className="px-4 py-3 font-medium">{transfer.provider}</td>
                      <td className="px-4 py-3">{transfer.country}</td>
                      <td className="px-4 py-3 text-xs">{transfer.legalMechanism}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              <strong>Hinweis:</strong> Es werden standardmäßig keine besonderen Kategorien personenbezogener
              Daten im Sinne von Art. 9 DSGVO übermittelt.
            </p>
          </section>

          {/* Section 2: Legal Assessment */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
              <Scale className="h-5 w-5" />
              2. Rechtliche Bewertung (USA)
            </h2>
            <div className="space-y-6">
              <div className="rounded-md border p-4">
                <h3 className="mb-2 font-semibold text-gray-800">
                  a) Unterliegen die Anbieter Gesetzen zum behördlichen Zugriff?
                </h3>
                <p className="text-sm text-gray-700">
                  <strong>Ja.</strong> US-Anbieter unterliegen potenziell FISA Section 702 und EO 12333.
                  Diese Gesetze ermöglichen US-Behörden unter bestimmten Umständen den Zugriff auf Daten
                  für Zwecke der nationalen Sicherheit.
                </p>
              </div>

              <div className="rounded-md border p-4">
                <h3 className="mb-2 font-semibold text-gray-800">
                  b) Bewertung nach Notwendigkeit und Verhältnismäßigkeit
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  Die verarbeiteten Daten unterliegen einer geringen Wahrscheinlichkeit für behördlichen Zugriff,
                  basierend auf folgenden <strong>objektiven Kriterien</strong>:
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                    <span><strong>Keine systematische Massenverarbeitung:</strong> Die Daten betreffen einzelne Geschäftskunden und deren Endkunden, keine Massenkommunikation oder großflächige Verbraucherprofilierung.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                    <span><strong>Keine Kommunikationsdienste i.S.d. US-Überwachungsfokus:</strong> Die genutzten Dienste sind SaaS-Infrastruktur (Datenbank, Hosting, API-Gateway), keine Electronic Communication Service Provider im Sinne von FISA.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                    <span><strong>Keine Bulk-Data-Strukturen:</strong> Die verarbeiteten Daten (Buchungstermine, Kontaktdaten, Chat-Nachrichten) sind granular und geschäftsbezogen, nicht aggregiert oder für Massenanalysen geeignet.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                    <span><strong>Hohe technische und rechtliche Hürden:</strong> Ein behördlicher Zugriff würde erheblichen rechtlichen und technischen Aufwand erfordern (Gerichtsbeschluss, Zugriff auf verschlüsselte Daten, Identifizierung relevanter Datensätze).</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-md border p-4">
                <h3 className="mb-2 font-semibold text-gray-800">
                  c) Schlussfolgerung zur Verhältnismäßigkeit (EDPB-konform)
                </h3>
                <p className="text-sm text-gray-700">
                  Unter Anwendung der EDPB-Empfehlungen 01/2020 zur ergänzenden Maßnahmen für Übermittlungen
                  kommen wir zu folgendem Ergebnis:
                </p>
                <div className="mt-3 rounded-md bg-gray-50 p-4">
                  <p className="text-sm text-gray-700 italic">
                    &quot;Ein behördlicher Zugriff wäre selbst im Fall einer Anordnung nur unter erheblichem
                    rechtlichem und technischem Aufwand möglich und stünde außer Verhältnis zum verfolgten Zweck.
                    Die Art der verarbeiteten Daten (geschäftliche Buchungsdaten, Kontaktinformationen) weist
                    keinen erkennbaren nachrichtendienstlichen Wert auf. Die implementierten technischen Maßnahmen
                    (Verschlüsselung, Zugriffskontrollen, Zero Data Retention) reduzieren das Risiko weiter.&quot;
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Safeguards per Provider */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
              <Shield className="h-5 w-5" />
              3. Technische und organisatorische Schutzmaßnahmen
            </h2>
            <div className="space-y-4">
              {transfers.map((transfer, index) => {
                const Icon = transfer.icon
                return (
                  <div key={index} className="rounded-lg border p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                          <Icon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{transfer.provider}</h3>
                          <p className="text-sm text-gray-500">{transfer.purpose}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        transfer.riskLevel === 'low'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {transfer.riskLevel === 'low' ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Niedriges Risiko
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3" />
                            Mittleres Risiko
                          </>
                        )}
                      </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase text-gray-500">Datenkategorien</p>
                        <ul className="space-y-1 text-sm text-gray-600">
                          {transfer.dataCategories.map((cat, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                              {cat}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase text-gray-500">Schutzmaßnahmen</p>
                        <ul className="space-y-1 text-sm text-gray-600">
                          {transfer.safeguards.map((safeguard, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
                              {safeguard}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {transfer.additionalNotes && transfer.additionalNotes.length > 0 && (
                      <div className="mt-4 rounded-md bg-blue-50 p-4">
                        <p className="mb-2 text-xs font-medium uppercase text-blue-600">Zusätzliche Hinweise</p>
                        {transfer.additionalNotes.map((note, i) => (
                          <p key={i} className="text-sm text-blue-700 mb-2 last:mb-0">{note}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Section 4: Conclusion */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
              <CheckCircle className="h-5 w-5 text-green-600" />
              4. Schlussfolgerung
            </h2>
            <div className="rounded-md border border-green-200 bg-green-50 p-6">
              <p className="text-sm text-green-800 leading-relaxed">
                Unter Berücksichtigung der <strong>Art der Daten</strong> (primär geschäftliche Buchungsdaten
                und Kontaktinformationen), des <strong>Zwecks der Verarbeitung</strong> (Bereitstellung von
                SaaS-Infrastrukturdiensten), des <strong>rechtlichen Rahmens im Zielland</strong> (USA mit
                FISA 702/EO 12333, jedoch ohne systematischen Fokus auf diese Datenkategorien), der
                <strong> Notwendigkeit und Verhältnismäßigkeit</strong> eines hypothetischen behördlichen Zugriffs
                (hoher Aufwand bei geringem nachrichtendienstlichem Wert), und der
                <strong> implementierten technischen und organisatorischen Schutzmaßnahmen</strong> (Verschlüsselung,
                Zugriffskontrollen, vertragliche Bindungen, Zero Data Retention) kommt der Datenexporteur zu dem
                Schluss, dass die Übermittlungen das durch EU-Recht garantierte Schutzniveau nicht untergraben
                und die Rechte der betroffenen Personen weiterhin wirksam geschützt sind.
              </p>
            </div>
          </section>

          {/* Special Note: OpenRouter */}
          <section className="mb-8 rounded-md border border-amber-200 bg-amber-50 p-6">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Besondere Bewertung: OpenRouter (KI-Verarbeitung)
            </h2>
            <div className="space-y-3 text-sm text-amber-700">
              <p>
                OpenRouter stellt das höchste Risiko in diesem Stack dar, da Chat-Nachrichten mit
                potenziell sensiblen Kundeninformationen verarbeitet werden.
              </p>

              <div className="rounded-md bg-amber-100 p-4">
                <p className="font-semibold mb-2">Unterauftragsverarbeiterkette (API-Gateway-Modell)</p>
                <p>
                  OpenRouter fungiert als API-Gateway. Je nach Modellauswahl werden weitere
                  Unterauftragsverarbeiter (z.B. Anthropic, Google) eingebunden, die jeweils
                  eigenen technischen und organisatorischen Maßnahmen unterliegen.
                </p>
                <p className="mt-2">
                  Diese Anbieter sind in der{' '}
                  <Link href="/legal/unterauftragsverarbeiter" className="underline font-medium">
                    Unterauftragsverarbeiterliste
                  </Link>{' '}
                  aufgeführt und vertraglich durch SCCs bzw. gleichwertige Garantien eingebunden.
                </p>
              </div>

              <p><strong>Risikomitigierende Faktoren:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Zero Data Retention (ZDR):</strong> Prompts und Antworten werden nicht gespeichert</li>
                <li><strong>Keine KI-Training:</strong> Kundendaten werden nicht für Modelltraining verwendet</li>
                <li><strong>Transiente Verarbeitung:</strong> Daten existieren nur während der API-Anfrage</li>
                <li><strong>TLS-Verschlüsselung:</strong> Alle Übertragungen sind verschlüsselt</li>
                <li><strong>Modellauswahl:</strong> Hebelki kontrolliert, welche Modelle verwendet werden</li>
                <li><strong>Deaktivierbar:</strong> Kunden können KI-Funktionen vollständig deaktivieren</li>
              </ul>
              <p className="mt-3">
                <strong>Empfehlung:</strong> Kunden sollten darauf hingewiesen werden, keine hochsensiblen
                Daten (z.B. Gesundheitsinformationen, Finanzdetails) über den Chatbot zu übermitteln.
                Diese Warnung ist im Chatbot-Disclaimer enthalten.
              </p>
            </div>
          </section>

          {/* Organizational Measures */}
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Übergreifende organisatorische Maßnahmen</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border p-4">
                <h3 className="mb-2 font-semibold text-gray-800">Vertragliche Absicherung</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
                    SCCs (Modul 3) mit allen US-Anbietern abgeschlossen
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
                    DPAs (Data Processing Agreements) aktiv
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
                    Unterauftragsverarbeiter-Transparenz gewährleistet
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
                    Vertragliche Benachrichtigungspflichten bei behördlichen Anfragen
                  </li>
                </ul>
              </div>
              <div className="rounded-md border p-4">
                <h3 className="mb-2 font-semibold text-gray-800">Laufende Überwachung</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
                    Jährliche Überprüfung dieser TIA
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
                    Monitoring von Rechtsänderungen (US/EU)
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
                    Incident-Response-Prozess dokumentiert
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
                    Regelmäßige Überprüfung der DPF-Zertifizierungen
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Signature */}
          <section className="rounded-md border border-gray-200 bg-gray-50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Dokumentation</h2>
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div>
                <p className="text-gray-500">Erstellt von</p>
                <p className="font-medium">Hebelki Compliance</p>
              </div>
              <div>
                <p className="text-gray-500">Datum</p>
                <p className="font-medium">{TIA_DATE}</p>
              </div>
              <div>
                <p className="text-gray-500">Nächste Überprüfung</p>
                <p className="font-medium">Februar 2027</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Diese TIA wird bei wesentlichen Änderungen der Infrastruktur, nach Sicherheitsvorfällen,
              bei neuen regulatorischen Anforderungen oder bei Änderungen der Rechtslage in Drittländern aktualisiert.
            </p>
          </section>

          {/* Footer */}
          <div className="mt-8 border-t pt-6">
            <p className="text-center text-sm text-gray-500">
              Version {TIA_VERSION} | Stand: {TIA_DATE}<br />
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
