import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Shield, CheckCircle, Globe, Server, MessageSquare, Lock, Database, Cloud, Cpu, Mail, Scale, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Unterauftragsverarbeiter | Hebelki',
  description: 'Liste aller Unterauftragsverarbeiter der Hebelki Buchungsplattform gemäß Art. 28 DSGVO',
}

// Sub-processor list version - bump when list changes
export const SUBPROCESSOR_VERSION = '2026.02'

interface SubProcessor {
  name: string
  purpose: string
  location: string
  dpaStatus: 'certified' | 'scc' | 'self-hosted'
  dpaLink?: string
  icon: React.ComponentType<{ className?: string }>
  details: string[]
  transferMechanism?: string
}

const subProcessors: SubProcessor[] = [
  {
    name: 'Neon',
    purpose: 'Datenbank (PostgreSQL)',
    location: 'USA (AWS)',
    dpaStatus: 'scc',
    dpaLink: 'https://neon.tech/dpa',
    icon: Database,
    details: [
      '72h Breach-Benachrichtigung',
      'SOC 2 Type II zertifiziert',
      'Verschlüsselung at-rest (AES-256)',
      'Automatische Backups',
    ],
    transferMechanism: 'Standard Contractual Clauses (SCCs)',
  },
  {
    name: 'OpenRouter',
    purpose: 'KI/LLM API Gateway',
    location: 'USA',
    dpaStatus: 'scc',
    dpaLink: 'https://openrouter.ai/privacy',
    icon: Cpu,
    details: [
      'Zero Data Retention (ZDR) Option',
      'Enterprise SCCs verfügbar',
      'Keine Speicherung von Prompts',
      'Modellauswahl durch Hebelki',
      'API-Gateway für nachgelagerte KI-Anbieter',
    ],
    transferMechanism: 'Standard Contractual Clauses (SCCs)',
  },
  {
    name: 'Anthropic (via OpenRouter)',
    purpose: 'KI-Modellanbieter (Claude)',
    location: 'USA',
    dpaStatus: 'scc',
    dpaLink: 'https://www.anthropic.com/legal/commercial-terms',
    icon: Sparkles,
    details: [
      'Zero Data Retention bei API-Nutzung',
      'Keine Verwendung für Modelltraining',
      'SOC 2 Type II zertifiziert',
      'Transiente Verarbeitung nur während API-Anfrage',
    ],
    transferMechanism: 'Standard Contractual Clauses (SCCs)',
  },
  {
    name: 'Google (via OpenRouter)',
    purpose: 'KI-Modellanbieter (Gemini)',
    location: 'USA',
    dpaStatus: 'scc',
    dpaLink: 'https://cloud.google.com/terms/data-processing-addendum',
    icon: Sparkles,
    details: [
      'Zero Data Retention bei API-Nutzung',
      'Keine Verwendung für Modelltraining',
      'ISO 27001 und SOC 2 zertifiziert',
      'Transiente Verarbeitung nur während API-Anfrage',
    ],
    transferMechanism: 'Standard Contractual Clauses (SCCs)',
  },
  {
    name: 'Clerk',
    purpose: 'Authentifizierung',
    location: 'USA',
    dpaStatus: 'certified',
    dpaLink: 'https://clerk.com/legal/dpa',
    icon: Lock,
    details: [
      'EU-US Data Privacy Framework (DPF) zertifiziert',
      'Irische Datenschutzbehörde als Aufsicht',
      'SOC 2 Type II',
      'MFA und Session-Management',
    ],
    transferMechanism: 'Data Privacy Framework + SCCs',
  },
  {
    name: 'Twilio',
    purpose: 'WhatsApp/SMS Messaging',
    location: 'USA',
    dpaStatus: 'scc',
    dpaLink: 'https://www.twilio.com/en-us/legal/data-protection-addendum',
    icon: MessageSquare,
    details: [
      'SCCs automatisch in ToS enthalten',
      'Processor-Rolle standardmäßig',
      'HIPAA-fähig',
      'Nachrichtenprotokolle konfigurierbar',
    ],
    transferMechanism: 'Standard Contractual Clauses (SCCs)',
  },
  {
    name: 'Cloudflare R2',
    purpose: 'Objektspeicherung (Bilder, Dateien)',
    location: 'EU',
    dpaStatus: 'certified',
    dpaLink: 'https://www.cloudflare.com/cloudflare-customer-dpa/',
    icon: Cloud,
    details: [
      'EU-US Data Privacy Framework zertifiziert',
      'EU-Datenresidenz-Option',
      'S3-kompatibel',
      'Automatische Verschlüsselung',
    ],
    transferMechanism: 'EU Data Residency + DPF',
  },
  {
    name: 'Vercel',
    purpose: 'App-Hosting (Edge Network)',
    location: 'USA/Global',
    dpaStatus: 'scc',
    dpaLink: 'https://vercel.com/legal/dpa',
    icon: Globe,
    details: [
      'GDPR-konform',
      'Edge-Funktionen weltweit',
      'Automatisches SSL',
      'DDoS-Schutz inklusive',
    ],
    transferMechanism: 'Standard Contractual Clauses (SCCs)',
  },
  {
    name: 'Fly.io',
    purpose: 'Worker-Services (n8n)',
    location: 'USA/EU',
    dpaStatus: 'scc',
    dpaLink: 'https://fly.io/documents',
    icon: Server,
    details: [
      'EU-Regionen bevorzugt genutzt',
      'Region-Auswahl möglich (EU)',
      'Container-Isolierung',
      'Verschlüsselte Volumes',
    ],
    transferMechanism: 'Standard Contractual Clauses (SCCs) + EU-Region',
  },
  {
    name: 'SMTP Server (hebelki.de)',
    purpose: 'E-Mail-Versand',
    location: 'EU (Deutschland)',
    dpaStatus: 'self-hosted',
    icon: Mail,
    details: [
      'Selbst gehostet in EU',
      'Kein Datentransfer außerhalb EU',
      'TLS-Verschlüsselung',
      'Keine Drittanbieter-Abhängigkeit',
    ],
    transferMechanism: 'Kein Transfer (EU-Hosting)',
  },
]

function DPAStatusBadge({ status }: { status: SubProcessor['dpaStatus'] }) {
  switch (status) {
    case 'certified':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          <CheckCircle className="h-3 w-3" />
          DPF Zertifiziert
        </span>
      )
    case 'scc':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          <Shield className="h-3 w-3" />
          SCCs
        </span>
      )
    case 'self-hosted':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          <Server className="h-3 w-3" />
          Self-Hosted EU
        </span>
      )
  }
}

export default function SubProcessorsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <Link
          href="/legal/avv"
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zum AVV
        </Link>

        <div className="rounded-lg border bg-white p-8 shadow-sm">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Unterauftragsverarbeiter</h1>
                <p className="text-sm text-gray-500">Anlage 2 zum AVV | Stand: {SUBPROCESSOR_VERSION}</p>
              </div>
            </div>
          </div>

          {/* Introduction */}
          <section className="mb-8 rounded-md border border-blue-200 bg-blue-50 p-6">
            <h2 className="mb-3 font-semibold text-blue-800">Übersicht</h2>
            <p className="mb-4 text-sm text-blue-700">
              Diese Liste enthält alle Unterauftragsverarbeiter, die im Rahmen der Hebelki-Plattform
              personenbezogene Daten verarbeiten. Alle Anbieter wurden sorgfältig ausgewählt und
              verfügen über gültige Datenschutzvereinbarungen.
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  <CheckCircle className="h-3 w-3" />
                  DPF
                </span>
                <span className="text-blue-600">= EU-US Data Privacy Framework zertifiziert</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  <Shield className="h-3 w-3" />
                  SCCs
                </span>
                <span className="text-blue-600">= Standard Contractual Clauses</span>
              </div>
            </div>
          </section>

          {/* TIA Link */}
          <section className="mb-8">
            <Link
              href="/legal/tia"
              className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-4 hover:border-amber-300 hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Scale className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-800">Transfer Impact Assessments (TIA)</p>
                  <p className="text-sm text-amber-700">
                    Bewertung der Datenübermittlungen in die USA gemäß Schrems II
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-amber-600" />
            </Link>
          </section>

          {/* Sub-processor List */}
          <section className="mb-8">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">Aktuelle Unterauftragsverarbeiter</h2>
            <div className="space-y-4">
              {subProcessors.map((processor, index) => {
                const Icon = processor.icon
                return (
                  <div key={index} className="rounded-lg border p-6 hover:border-gray-300">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                          <Icon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-gray-900">{processor.name}</h3>
                            <DPAStatusBadge status={processor.dpaStatus} />
                          </div>
                          <p className="text-sm text-gray-600">{processor.purpose}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            <Globe className="mr-1 inline h-3 w-3" />
                            {processor.location}
                          </p>
                        </div>
                      </div>
                      {processor.dpaLink && (
                        <a
                          href={processor.dpaLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          DPA ansehen
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase text-gray-500">Schutzmaßnahmen</p>
                        <ul className="space-y-1 text-sm text-gray-600">
                          {processor.details.map((detail, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {processor.transferMechanism && (
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase text-gray-500">Transfermechanismus</p>
                          <p className="text-sm text-gray-600">{processor.transferMechanism}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Transfer Mechanisms Explained */}
          <section className="mb-8 rounded-md border border-gray-200 bg-gray-50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Transfermechanismen erklärt</h2>
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h3 className="font-semibold">EU-US Data Privacy Framework (DPF)</h3>
                <p>
                  US-Unternehmen können sich beim DPF selbst zertifizieren, um EU-Standards zu erfüllen.
                  Die Zertifizierung wird vom US-Handelsministerium überwacht und ist für GDPR-konforme
                  Datenübertragungen anerkannt.
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Standard Contractual Clauses (SCCs)</h3>
                <p>
                  Von der EU-Kommission genehmigte Vertragsklauseln für internationale Datentransfers.
                  Module 2 (Controller → Processor) und Module 3 (Processor → Sub-processor) sind relevant.
                </p>
              </div>
              <div>
                <h3 className="font-semibold">EU-Datenresidenz</h3>
                <p>
                  Einige Anbieter ermöglichen die Speicherung von Daten ausschließlich in der EU,
                  wodurch kein internationaler Datentransfer stattfindet.
                </p>
              </div>
            </div>
          </section>

          {/* Change Notification */}
          <section className="mb-8 rounded-md border border-amber-200 bg-amber-50 p-6">
            <h2 className="mb-3 font-semibold text-amber-800">Änderungsmitteilungen</h2>
            <div className="space-y-3 text-sm text-amber-700">
              <p>
                <strong>Mitteilungsfrist:</strong> Hebelki informiert Sie mindestens 14 Tage vor
                Aufnahme eines neuen Unterauftragsverarbeiters per E-Mail.
              </p>
              <p>
                <strong>Widerspruch:</strong> Sie können innerhalb von 14 Tagen aus wichtigem Grund
                widersprechen. Bei berechtigtem Widerspruch und keiner Einigung besteht ein
                außerordentliches Kündigungsrecht.
              </p>
              <p>
                <strong>Aktualisierungen:</strong> Diese Liste wird regelmäßig aktualisiert.
                Die aktuelle Version ist immer unter dieser URL abrufbar.
              </p>
            </div>
          </section>

          {/* Summary Table */}
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Zusammenfassung</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Anbieter</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Zweck</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Standort</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {subProcessors.map((processor, index) => (
                    <tr key={index}>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{processor.name}</td>
                      <td className="px-4 py-3 text-gray-600">{processor.purpose}</td>
                      <td className="px-4 py-3 text-gray-600">{processor.location}</td>
                      <td className="px-4 py-3">
                        <DPAStatusBadge status={processor.dpaStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t pt-6">
            <p className="text-center text-sm text-gray-500">
              Stand: {SUBPROCESSOR_VERSION} | Version wird bei Änderungen aktualisiert<br />
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
