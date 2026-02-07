import { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowLeft,
  Shield,
  Lock,
  Server,
  Users,
  Eye,
  Database,
  RefreshCw,
  AlertTriangle,
  FileCheck,
  Key,
  Network,
  HardDrive,
  Clock,
  CheckCircle,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Technische und Organisatorische Maßnahmen (TOMs) | Hebelki',
  description: 'Dokumentation der technischen und organisatorischen Maßnahmen gemäß Art. 32 DSGVO',
}

// TOMs version - bump when measures change
export const TOMS_VERSION = '1.0'

interface TOMCategory {
  title: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  measures: string[]
}

const tomCategories: TOMCategory[] = [
  {
    title: 'Zutrittskontrolle',
    icon: Lock,
    description: 'Maßnahmen zur Verhinderung unbefugten Zutritts zu Datenverarbeitungsanlagen',
    measures: [
      'Cloud-basierte Infrastruktur (kein physischer Serverzugang)',
      'Rechenzentren von Neon, Vercel und Cloudflare mit ISO 27001 Zertifizierung',
      'Physische Sicherheit durch Hosting-Anbieter gewährleistet (24/7 Überwachung)',
      'Keine lokale Datenspeicherung auf Mitarbeitergeräten',
    ],
  },
  {
    title: 'Zugangskontrolle',
    icon: Key,
    description: 'Maßnahmen zur Verhinderung unbefugter Nutzung von Datenverarbeitungssystemen',
    measures: [
      'Authentifizierung über Clerk (SOC 2 Type II zertifiziert)',
      'Multi-Faktor-Authentifizierung (MFA) verfügbar',
      'Passwort-Richtlinien: Mindestlänge 8 Zeichen, Komplexitätsanforderungen',
      'Automatische Session-Timeout nach 30 Minuten Inaktivität',
      'Verschlüsselte Session-Token (JWT)',
      'Rate-Limiting für Anmeldeversuche',
    ],
  },
  {
    title: 'Zugriffskontrolle',
    icon: Users,
    description: 'Maßnahmen zur Gewährleistung, dass Berechtigte nur auf ihre Daten zugreifen können',
    measures: [
      'Rollenbasiertes Zugriffsmodell (Owner, Admin, Staff)',
      'Multi-Tenant-Architektur mit strikter Datenisolierung',
      'Jede Datenbankabfrage enthält Mandanten-Filter (businessId)',
      'API-Endpoints prüfen Zugehörigkeit vor Datenzugriff',
      'Mitarbeiter-Berechtigungen individuell konfigurierbar',
      'Audit-Logs für kritische Aktionen',
    ],
  },
  {
    title: 'Weitergabekontrolle',
    icon: Network,
    description: 'Maßnahmen zum Schutz bei Übertragung und Transport von Daten',
    measures: [
      'TLS 1.3 Verschlüsselung für alle Datenübertragungen',
      'HTTPS-only (HTTP-Anfragen werden umgeleitet)',
      'Sichere API-Kommunikation mit Authentifizierung',
      'Keine unverschlüsselte E-Mail-Übertragung sensibler Daten',
      'VPN-geschützte Verbindungen zu Unterauftragsverarbeitern',
    ],
  },
  {
    title: 'Eingabekontrolle',
    icon: FileCheck,
    description: 'Maßnahmen zur Nachvollziehbarkeit von Dateneingaben und -änderungen',
    measures: [
      'Automatische Zeitstempel für alle Datensätze (createdAt, updatedAt)',
      'Benutzer-Zuordnung bei Änderungen (Clerk User ID)',
      'Audit-Trail für Buchungsänderungen',
      'Protokollierung von Dashboard-Aktionen',
      'Versionierung von Einstellungsänderungen',
    ],
  },
  {
    title: 'Auftragskontrolle',
    icon: Shield,
    description: 'Maßnahmen zur weisungsgemäßen Verarbeitung durch Auftragsverarbeiter',
    measures: [
      'Vertragliche Bindung aller Unterauftragsverarbeiter (DPAs)',
      'Standard Contractual Clauses (SCCs) mit allen US-Anbietern',
      'Regelmäßige Überprüfung der Unterauftragsverarbeiter',
      'Dokumentation aller Weisungen (Dashboard-Konfiguration)',
      'Keine Verarbeitung außerhalb der vereinbarten Zwecke',
    ],
  },
  {
    title: 'Verfügbarkeitskontrolle',
    icon: Server,
    description: 'Maßnahmen zum Schutz gegen zufällige Zerstörung oder Verlust',
    measures: [
      'Automatische Datenbank-Backups (Neon: kontinuierlich)',
      'Point-in-Time Recovery möglich (bis zu 7 Tage)',
      'Geografisch verteilte Infrastruktur (Vercel Edge Network)',
      'DDoS-Schutz durch Cloudflare',
      'Hochverfügbarkeit: 99.9% SLA (Vercel, Neon)',
      'Disaster-Recovery-Prozeduren dokumentiert',
    ],
  },
  {
    title: 'Trennungskontrolle',
    icon: Database,
    description: 'Maßnahmen zur getrennten Verarbeitung für unterschiedliche Zwecke',
    measures: [
      'Multi-Tenant-Architektur mit logischer Datentrennung',
      'Jeder Mandant (Business) hat eigene businessId',
      'Datenbankebene: Row-Level Security',
      'Keine gemeinsame Nutzung von Kundendaten zwischen Mandanten',
      'Separate Konfigurationen pro Mandant',
    ],
  },
]

const additionalMeasures = [
  {
    title: 'Verschlüsselung',
    icon: Lock,
    items: [
      'Datenbank: Verschlüsselung at-rest (AES-256) durch Neon',
      'Datenübertragung: TLS 1.3 für alle Verbindungen',
      'Passwörter: Bcrypt-Hashing (niemals im Klartext)',
      'API-Keys und Secrets: Verschlüsselt in Umgebungsvariablen',
    ],
  },
  {
    title: 'Datenschutz by Design',
    icon: Shield,
    items: [
      'Datenminimierung: Nur notwendige Daten werden erhoben',
      'Automatische Löschung: Chatbot-Gespräche nach 90 Tagen',
      'Pseudonymisierung: Interne IDs statt Klarnamen in Logs',
      'Opt-In: WhatsApp-Kommunikation nur nach Zustimmung',
    ],
  },
  {
    title: 'Incident Response',
    icon: AlertTriangle,
    items: [
      'Definierter Incident-Response-Prozess',
      'Benachrichtigung des Verantwortlichen binnen 24 Stunden',
      'Dokumentation aller Sicherheitsvorfälle',
      'Regelmäßige Überprüfung und Aktualisierung der Prozesse',
    ],
  },
  {
    title: 'Mitarbeiterschulung',
    icon: Users,
    items: [
      'Datenschutz-Schulung für alle Mitarbeiter',
      'Vertraulichkeitsverpflichtung',
      'Need-to-know-Prinzip für Datenzugriff',
      'Regelmäßige Awareness-Schulungen',
    ],
  },
]

export default function TOMsPage() {
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
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Technische und Organisatorische Maßnahmen
                </h1>
                <p className="text-sm text-gray-500">Anlage 1 zum AVV | Art. 32 DSGVO | Version {TOMS_VERSION}</p>
              </div>
            </div>
          </div>

          {/* Introduction */}
          <section className="mb-8 rounded-md border border-green-200 bg-green-50 p-6">
            <h2 className="mb-3 font-semibold text-green-800">Übersicht</h2>
            <p className="text-sm text-green-700">
              Diese Dokumentation beschreibt die technischen und organisatorischen Maßnahmen,
              die Hebelki gemäß Art. 32 DSGVO implementiert hat, um ein dem Risiko angemessenes
              Schutzniveau für personenbezogene Daten zu gewährleisten.
            </p>
          </section>

          {/* Main TOM Categories */}
          <section className="mb-8">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">Schutzziele nach Art. 32 DSGVO</h2>
            <div className="space-y-6">
              {tomCategories.map((category, index) => {
                const Icon = category.icon
                return (
                  <div key={index} className="rounded-lg border p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                        <Icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{category.title}</h3>
                        <p className="text-sm text-gray-500">{category.description}</p>
                      </div>
                    </div>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {category.measures.map((measure, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                          {measure}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Additional Measures */}
          <section className="mb-8">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">Ergänzende Maßnahmen</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {additionalMeasures.map((measure, index) => {
                const Icon = measure.icon
                return (
                  <div key={index} className="rounded-lg border p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <Icon className="h-5 w-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">{measure.title}</h3>
                    </div>
                    <ul className="space-y-2">
                      {measure.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Infrastructure Overview */}
          <section className="mb-8 rounded-md border border-gray-200 bg-gray-50 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <HardDrive className="h-5 w-5" />
              Infrastruktur-Übersicht
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4 text-left font-medium text-gray-600">Komponente</th>
                    <th className="py-2 pr-4 text-left font-medium text-gray-600">Anbieter</th>
                    <th className="py-2 pr-4 text-left font-medium text-gray-600">Zertifizierungen</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2 pr-4 font-medium">Datenbank</td>
                    <td className="py-2 pr-4">Neon (PostgreSQL)</td>
                    <td className="py-2 pr-4">SOC 2 Type II</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">App-Hosting</td>
                    <td className="py-2 pr-4">Vercel</td>
                    <td className="py-2 pr-4">SOC 2 Type II, ISO 27001</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Authentifizierung</td>
                    <td className="py-2 pr-4">Clerk</td>
                    <td className="py-2 pr-4">SOC 2 Type II, GDPR</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">CDN/Speicher</td>
                    <td className="py-2 pr-4">Cloudflare R2</td>
                    <td className="py-2 pr-4">ISO 27001, SOC 2</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">KI-Verarbeitung</td>
                    <td className="py-2 pr-4">OpenRouter</td>
                    <td className="py-2 pr-4">Zero Data Retention Option</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Messaging</td>
                    <td className="py-2 pr-4">Twilio</td>
                    <td className="py-2 pr-4">SOC 2, ISO 27001, HIPAA</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Regular Review */}
          <section className="mb-8 rounded-md border border-blue-200 bg-blue-50 p-6">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-blue-800">
              <RefreshCw className="h-5 w-5" />
              Regelmäßige Überprüfung
            </h2>
            <div className="space-y-2 text-sm text-blue-700">
              <p>
                <strong>Frequenz:</strong> Die technischen und organisatorischen Maßnahmen werden
                mindestens jährlich auf ihre Wirksamkeit überprüft und bei Bedarf angepasst.
              </p>
              <p>
                <strong>Auslöser:</strong> Zusätzliche Überprüfungen erfolgen bei wesentlichen
                Änderungen der Infrastruktur, nach Sicherheitsvorfällen oder bei neuen
                regulatorischen Anforderungen.
              </p>
              <p>
                <strong>Dokumentation:</strong> Änderungen werden versioniert und sind in dieser
                Dokumentation nachvollziehbar.
              </p>
            </div>
          </section>

          {/* SLA Information */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Clock className="h-5 w-5" />
              Verfügbarkeit und SLAs
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-md border p-4 text-center">
                <p className="text-2xl font-bold text-green-600">99.9%</p>
                <p className="text-sm text-gray-500">Plattform-Verfügbarkeit</p>
              </div>
              <div className="rounded-md border p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">24h</p>
                <p className="text-sm text-gray-500">Incident-Benachrichtigung</p>
              </div>
              <div className="rounded-md border p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">7 Tage</p>
                <p className="text-sm text-gray-500">Point-in-Time Recovery</p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="rounded-md border border-amber-200 bg-amber-50 p-6">
            <h2 className="mb-3 font-semibold text-amber-800">Ansprechpartner für Sicherheitsfragen</h2>
            <p className="text-sm text-amber-700">
              Bei Fragen zu den technischen und organisatorischen Maßnahmen oder zur Meldung
              von Sicherheitsvorfällen wenden Sie sich bitte an:
            </p>
            <p className="mt-2 text-sm">
              <strong>E-Mail:</strong>{' '}
              <a href="mailto:security@hebelki.de" className="text-primary hover:underline">
                security@hebelki.de
              </a>
            </p>
          </section>

          {/* Footer */}
          <div className="mt-8 border-t pt-6">
            <p className="text-center text-sm text-gray-500">
              Stand: Februar 2026 | Version {TOMS_VERSION}<br />
              Diese Dokumentation wird bei Änderungen der Maßnahmen aktualisiert.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
