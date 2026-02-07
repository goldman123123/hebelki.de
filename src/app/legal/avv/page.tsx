import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, FileText, Download, ExternalLink, Shield, Users, Server, Clock, AlertTriangle, Scale } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Auftragsverarbeitungsvertrag (AVV) | Hebelki',
  description: 'Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO für die Hebelki Buchungsplattform',
}

// Current AVV version - bump when legal terms change
export const AVV_VERSION = '1.0'

export default function AVVPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link
          href="/datenschutz"
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Datenschutzerklärung
        </Link>

        <div className="rounded-lg border bg-white p-8 shadow-sm">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Auftragsverarbeitungsvertrag</h1>
                <p className="text-sm text-gray-500">Version {AVV_VERSION} | gemäß Art. 28 DSGVO</p>
              </div>
            </div>
            <a
              href="/legal/avv-v1.0.pdf"
              download
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              PDF herunterladen
            </a>
          </div>

          {/* Introduction */}
          <section className="mb-8 rounded-md border border-blue-200 bg-blue-50 p-6">
            <h2 className="mb-3 font-semibold text-blue-800">Wichtiger Hinweis</h2>
            <p className="text-sm text-blue-700">
              Dieser Auftragsverarbeitungsvertrag (AVV) regelt die Verarbeitung personenbezogener Daten
              durch Hebelki als Auftragsverarbeiter im Auftrag des Kunden (Verantwortlicher).
              Die Annahme erfolgt durch Akzeptieren in den Einstellungen Ihres Dashboards.
            </p>
          </section>

          {/* Section 1: Parties */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
              <Users className="h-5 w-5 text-gray-600" />
              § 1 Vertragsparteien
            </h2>
            <div className="space-y-4 text-gray-700">
              <div className="rounded-md border p-4">
                <p className="mb-2 font-semibold">Verantwortlicher (Auftraggeber):</p>
                <p className="text-sm text-gray-600">
                  Der Kunde, der die Hebelki-Plattform nutzt und die Verarbeitung personenbezogener
                  Daten seiner Endkunden in Auftrag gibt. Die konkreten Angaben ergeben sich aus
                  dem Hauptvertrag (SaaS-Nutzungsvertrag).
                </p>
              </div>
              <div className="rounded-md border p-4">
                <p className="mb-2 font-semibold">Auftragsverarbeiter:</p>
                <p className="text-sm text-gray-600">
                  Hebelki<br />
                  E-Mail: privacy@hebelki.de<br />
                  (nachfolgend &quot;Auftragnehmer&quot;)
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Subject and Duration */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
              <Clock className="h-5 w-5 text-gray-600" />
              § 2 Gegenstand und Dauer der Verarbeitung
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>Gegenstand:</strong> Bereitstellung einer Multi-Tenant SaaS-Buchungsplattform
                mit KI-gestütztem Chatbot zur Terminverwaltung, Kundenkommunikation und Buchungsabwicklung.
              </p>
              <p>
                <strong>Dauer:</strong> Die Verarbeitung erfolgt für die Dauer des SaaS-Nutzungsvertrags.
                Nach Beendigung werden die Daten gemäß § 13 dieses Vertrags gelöscht oder zurückgegeben.
              </p>
            </div>
          </section>

          {/* Section 3: Type and Purpose */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">§ 3 Art und Zweck der Verarbeitung</h2>
            <div className="space-y-3 text-gray-700">
              <p>Die Verarbeitung umfasst folgende Tätigkeiten:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Speicherung und Verwaltung von Kundenbuchungen und Terminen</li>
                <li>KI-gestützte Kundenberatung via Chatbot (Web, WhatsApp)</li>
                <li>Terminverwaltung, Erinnerungen und Bestätigungen</li>
                <li>Rechnungserstellung und -verwaltung</li>
                <li>Kommunikation mit Endkunden (E-Mail, WhatsApp)</li>
                <li>Analytik zur Verbesserung des Services (anonymisiert)</li>
              </ul>
            </div>
          </section>

          {/* Section 4: Data Categories */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">§ 4 Art der personenbezogenen Daten</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border p-4">
                <h3 className="mb-2 font-semibold text-gray-800">Kontaktdaten</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Name (Vor- und Nachname)</li>
                  <li>• E-Mail-Adresse</li>
                  <li>• Telefonnummer</li>
                </ul>
              </div>
              <div className="rounded-md border p-4">
                <h3 className="mb-2 font-semibold text-gray-800">Adressdaten</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Straße und Hausnummer</li>
                  <li>• Postleitzahl und Ort</li>
                  <li>• Land</li>
                </ul>
              </div>
              <div className="rounded-md border p-4">
                <h3 className="mb-2 font-semibold text-gray-800">Buchungsdaten</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Termindetails und -historie</li>
                  <li>• Ausgewählte Dienstleistungen</li>
                  <li>• Kundennotizen</li>
                </ul>
              </div>
              <div className="rounded-md border p-4">
                <h3 className="mb-2 font-semibold text-gray-800">Kommunikationsdaten</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Chat-Nachrichten</li>
                  <li>• WhatsApp-Opt-In-Status</li>
                  <li>• E-Mail-Korrespondenz</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              <strong>Hinweis:</strong> Es werden keine besonderen Kategorien personenbezogener Daten
              im Sinne von Art. 9 DSGVO verarbeitet, es sei denn, der Verantwortliche gibt solche
              Daten explizit ein (z.B. Gesundheitsinformationen in Kundennotizen bei medizinischen Praxen).
            </p>
          </section>

          {/* Section 5: Data Subjects */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">§ 5 Kategorien betroffener Personen</h2>
            <ul className="list-disc space-y-2 pl-6 text-gray-700">
              <li><strong>Endkunden:</strong> Personen, die Termine beim Verantwortlichen buchen</li>
              <li><strong>Mitarbeiter des Verantwortlichen:</strong> Personal mit Zugang zur Plattform (optional)</li>
            </ul>
          </section>

          {/* Section 6: Controller Rights */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">§ 6 Pflichten und Rechte des Verantwortlichen</h2>
            <div className="space-y-3 text-gray-700">
              <p>Der Verantwortliche:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Bleibt für die Rechtmäßigkeit der Datenverarbeitung verantwortlich (Art. 24 DSGVO)</li>
                <li>Erteilt dokumentierte Weisungen an den Auftragnehmer</li>
                <li>Stellt die Rechtsgrundlage für die Verarbeitung sicher (z.B. Einwilligung, Vertragserfüllung)</li>
                <li>Informiert Betroffene über die Datenverarbeitung</li>
                <li>Ist für die Beantwortung von Betroffenenanfragen zuständig</li>
              </ul>
            </div>
          </section>

          {/* Section 7: Instructions */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">§ 7 Weisungsgebundenheit</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Der Auftragnehmer verarbeitet personenbezogene Daten ausschließlich auf dokumentierte
                Weisung des Verantwortlichen (Art. 28 Abs. 3 lit. a DSGVO).
              </p>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  <strong>Dokumentierte Weisungen:</strong> Die Konfiguration im Dashboard gilt als
                  dokumentierte Weisung. Dazu gehören: Aktivierung/Deaktivierung von Funktionen,
                  Festlegung der Datenaufbewahrungsdauer, Einstellungen für WhatsApp-Integration.
                </p>
              </div>
              <p>
                Der Auftragnehmer informiert den Verantwortlichen unverzüglich, wenn er der Ansicht ist,
                dass eine Weisung gegen datenschutzrechtliche Vorschriften verstößt (Art. 28 Abs. 3 Satz 3 DSGVO).
              </p>
            </div>
          </section>

          {/* Section 8: Confidentiality */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">§ 8 Vertraulichkeit</h2>
            <div className="space-y-3 text-gray-700">
              <p>
                Der Auftragnehmer gewährleistet, dass alle Personen, die Zugang zu personenbezogenen
                Daten haben:
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Zur Vertraulichkeit verpflichtet sind (Art. 28 Abs. 3 lit. b DSGVO)</li>
                <li>Nur nach dem Need-to-know-Prinzip Zugriff erhalten</li>
                <li>In den Anforderungen des Datenschutzes geschult sind</li>
              </ul>
            </div>
          </section>

          {/* Section 9: TOMs */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
              <Server className="h-5 w-5 text-gray-600" />
              § 9 Technische und Organisatorische Maßnahmen
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Der Auftragnehmer trifft alle erforderlichen technischen und organisatorischen
                Maßnahmen gemäß Art. 32 DSGVO, um ein dem Risiko angemessenes Schutzniveau zu
                gewährleisten.
              </p>
              <div className="rounded-md border p-4">
                <p className="mb-3 font-semibold">Die vollständige TOM-Dokumentation finden Sie unter:</p>
                <Link
                  href="/legal/toms"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  Anlage 1: Technische und Organisatorische Maßnahmen
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
              <p className="text-sm text-gray-600">
                Die TOMs umfassen insbesondere: Zugriffskontrolle (Clerk Auth, Rollen),
                Verschlüsselung (TLS, At-Rest), Multi-Tenant-Isolation, Verfügbarkeitsgarantien,
                und Protokollierung.
              </p>
            </div>
          </section>

          {/* Section 10: Sub-processors */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
              <Shield className="h-5 w-5 text-gray-600" />
              § 10 Unterauftragsverarbeiter
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Der Verantwortliche erteilt hiermit eine allgemeine Genehmigung zur Hinzuziehung
                weiterer Unterauftragsverarbeiter gemäß Art. 28 Abs. 2 DSGVO.
              </p>
              <div className="rounded-md border p-4">
                <p className="mb-3 font-semibold">Die aktuelle Liste der Unterauftragsverarbeiter:</p>
                <Link
                  href="/legal/unterauftragsverarbeiter"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  Anlage 2: Unterauftragsverarbeiter
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>Änderungsmitteilung:</strong> Der Auftragnehmer informiert den Verantwortlichen
                mindestens 14 Tage vor Aufnahme eines neuen Unterauftragsverarbeiters.</p>
                <p><strong>Widerspruchsrecht:</strong> Der Verantwortliche kann innerhalb von 14 Tagen
                nach Mitteilung aus wichtigem Grund widersprechen.</p>
                <p><strong>Vertragliche Bindung:</strong> Unterauftragsverarbeiter werden vertraglich
                auf gleichwertige Datenschutzpflichten verpflichtet.</p>
              </div>
            </div>
          </section>

          {/* Section 11: Data Subject Rights */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">§ 11 Unterstützung bei Betroffenenrechten</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Der Auftragnehmer unterstützt den Verantwortlichen bei der Erfüllung seiner Pflichten
                nach Art. 12-22 DSGVO (Betroffenenrechte):
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li><strong>Auskunft (Art. 15):</strong> Export der Kundendaten über Dashboard</li>
                <li><strong>Berichtigung (Art. 16):</strong> Bearbeitung im Dashboard</li>
                <li><strong>Löschung (Art. 17):</strong> Löschfunktion im Dashboard</li>
                <li><strong>Datenübertragbarkeit (Art. 20):</strong> JSON-Export aller Daten</li>
              </ul>
              <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-700">
                  <strong>Reaktionszeit:</strong> Der Auftragnehmer reagiert auf Unterstützungsanfragen
                  innerhalb von 48 Stunden (Geschäftszeiten).
                </p>
              </div>
            </div>
          </section>

          {/* Section 12: Security Incidents */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              § 12 Meldung von Datenschutzverletzungen
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Bei einer Verletzung des Schutzes personenbezogener Daten (Art. 33, 34 DSGVO):
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li><strong>Meldung an Verantwortlichen:</strong> Unverzüglich, spätestens innerhalb von 24 Stunden</li>
                <li><strong>Inhalt der Meldung:</strong> Art der Verletzung, betroffene Daten, ergriffene Maßnahmen</li>
                <li><strong>Unterstützung:</strong> Bei Meldung an Aufsichtsbehörde und Betroffene</li>
                <li><strong>Dokumentation:</strong> Führung eines Incident-Response-Protokolls</li>
              </ul>
            </div>
          </section>

          {/* Section 13: Deletion */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">§ 13 Löschung nach Vertragsende</h2>
            <div className="space-y-4 text-gray-700">
              <p>Nach Beendigung des Hauptvertrags:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li><strong>Löschung:</strong> Alle personenbezogenen Daten werden binnen 30 Tagen gelöscht</li>
                <li><strong>Rückgabe:</strong> Auf Wunsch erfolgt vorher eine vollständige Datenrückgabe (JSON-Export)</li>
                <li><strong>Bestätigung:</strong> Die Löschung wird auf Anfrage schriftlich bestätigt</li>
                <li><strong>Ausnahme:</strong> Gesetzliche Aufbewahrungspflichten (z.B. Rechnungen: 10 Jahre)</li>
              </ul>
            </div>
          </section>

          {/* Section 14: Audits */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">§ 14 Nachweispflichten und Kontrollen</h2>
            <div className="space-y-4 text-gray-700">
              <p>Der Auftragnehmer ermöglicht und unterstützt Überprüfungen (Art. 28 Abs. 3 lit. h DSGVO):</p>
              <ul className="list-disc space-y-2 pl-6">
                <li><strong>Dokumentation:</strong> Bereitstellung von Zertifikaten und Nachweisen auf Anfrage</li>
                <li><strong>Audits:</strong> Remote-Audits nach Terminvereinbarung möglich</li>
                <li><strong>Jahresbericht:</strong> Jährliche Übersicht über Sicherheitsmaßnahmen</li>
                <li><strong>Kosten:</strong> Der Verantwortliche trägt die Kosten für Vor-Ort-Audits</li>
              </ul>
            </div>
          </section>

          {/* Section 15: Liability */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">§ 15 Haftung</h2>
            <div className="space-y-3 text-gray-700">
              <p>
                Die Haftung richtet sich nach Art. 82 DSGVO. Jede Partei haftet für den Schaden,
                der durch eine nicht dieser Verordnung entsprechende Verarbeitung verursacht wurde.
              </p>
              <p>
                Der Auftragnehmer haftet nur für Schäden, die durch eine Verarbeitung verursacht wurden,
                bei der er seinen speziell ihm auferlegten Pflichten nicht nachgekommen ist oder
                gegen rechtmäßige Anweisungen des Verantwortlichen verstoßen hat.
              </p>
            </div>
          </section>

          {/* Section 16: Final Provisions */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">§ 16 Schlussbestimmungen</h2>
            <div className="space-y-3 text-gray-700">
              <ul className="list-disc space-y-2 pl-6">
                <li><strong>Schriftform:</strong> Änderungen bedürfen der Schriftform</li>
                <li><strong>Salvatorische Klausel:</strong> Unwirksame Bestimmungen werden durch wirksame ersetzt</li>
                <li><strong>Anwendbares Recht:</strong> Es gilt deutsches Recht</li>
                <li><strong>Gerichtsstand:</strong> Für Streitigkeiten ist das für den Sitz des Auftragnehmers zuständige Gericht zuständig</li>
              </ul>
            </div>
          </section>

          {/* Annexes */}
          <section className="rounded-md border border-gray-200 bg-gray-50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Anlagen zu diesem Vertrag</h2>
            <div className="space-y-3">
              <Link
                href="/legal/toms"
                className="flex items-center justify-between rounded-md border bg-white p-4 hover:border-primary"
              >
                <div>
                  <p className="font-medium">Anlage 1: Technische und Organisatorische Maßnahmen (TOMs)</p>
                  <p className="text-sm text-gray-500">Detaillierte Beschreibung der Sicherheitsmaßnahmen</p>
                </div>
                <ExternalLink className="h-5 w-5 text-gray-400" />
              </Link>
              <Link
                href="/legal/unterauftragsverarbeiter"
                className="flex items-center justify-between rounded-md border bg-white p-4 hover:border-primary"
              >
                <div>
                  <p className="font-medium">Anlage 2: Liste der Unterauftragsverarbeiter</p>
                  <p className="text-sm text-gray-500">Alle eingesetzten Unterauftragsverarbeiter mit DPA-Status</p>
                </div>
                <ExternalLink className="h-5 w-5 text-gray-400" />
              </Link>
              <Link
                href="/legal/tia"
                className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-4 hover:border-amber-300"
              >
                <div className="flex items-center gap-3">
                  <Scale className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">Anlage 3: Transfer Impact Assessments (TIA)</p>
                    <p className="text-sm text-amber-700">Bewertung der Datenübermittlungen gemäß Schrems II</p>
                  </div>
                </div>
                <ExternalLink className="h-5 w-5 text-amber-600" />
              </Link>
            </div>
          </section>

          {/* Footer */}
          <div className="mt-8 border-t pt-6">
            <p className="text-center text-sm text-gray-500">
              Stand: Februar 2026 | Version {AVV_VERSION}<br />
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
