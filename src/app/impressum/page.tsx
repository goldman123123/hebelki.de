/**
 * Impressum Page (Legal Notice)
 *
 * Required by German law (§5 TMG - Telemediengesetz)
 * Provides mandatory information about the website operator
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Impressum - Hebelki',
  description: 'Impressum und rechtliche Informationen zu Hebelki',
}

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Impressum
            </h1>
            <p className="text-sm text-gray-500">
              Angaben gemäß § 5 TMG
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Diensteanbieter
            </h2>
            <div className="bg-gray-50 p-6 rounded-lg space-y-2">
              <p className="font-medium text-gray-900">
                [FIRMENNAME EINTRAGEN]
              </p>
              <p className="text-gray-700">
                [RECHTSFORM, z.B. GmbH, UG, Einzelunternehmen]
              </p>
              <p className="text-gray-700">
                [Straße und Hausnummer]
              </p>
              <p className="text-gray-700">
                [PLZ Ort]
              </p>
              <p className="text-gray-700">
                Deutschland
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Kontakt
            </h2>
            <div className="space-y-2">
              <p className="text-gray-700">
                <strong>Telefon:</strong>{' '}
                <a href="tel:+49" className="text-blue-600 hover:underline">
                  [Telefonnummer eintragen]
                </a>
              </p>
              <p className="text-gray-700">
                <strong>E-Mail:</strong>{' '}
                <a
                  href="mailto:info@hebelki.de"
                  className="text-blue-600 hover:underline"
                >
                  info@hebelki.de
                </a>
              </p>
              <p className="text-gray-700">
                <strong>Website:</strong>{' '}
                <a
                  href="https://www.hebelki.de"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  www.hebelki.de
                </a>
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Vertretungsberechtigte Person
            </h2>
            <p className="text-gray-700">
              <strong>Geschäftsführer:</strong> [Name des Geschäftsführers]
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Registereintrag
            </h2>
            <div className="space-y-2">
              <p className="text-gray-700">
                <strong>Handelsregister:</strong> [Amtsgericht Ort]
              </p>
              <p className="text-gray-700">
                <strong>Registernummer:</strong> [HRB/HRA Nummer]
              </p>
            </div>
            <p className="text-sm text-gray-500 italic">
              (Falls nicht im Handelsregister eingetragen, diesen Abschnitt entfernen)
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Umsatzsteuer-ID
            </h2>
            <p className="text-gray-700">
              Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:
            </p>
            <p className="text-gray-700">
              <strong>USt-IdNr.:</strong> [DE000000000]
            </p>
            <p className="text-sm text-gray-500 italic">
              (Falls keine USt-IdNr. vorhanden, diesen Abschnitt entfernen)
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Verantwortlich für den Inhalt
            </h2>
            <p className="text-gray-700">
              Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">[Name]</p>
              <p className="text-gray-700">[Adresse]</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              EU-Streitschlichtung
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Die Europäische Kommission stellt eine Plattform zur
              Online-Streitbeilegung (OS) bereit:
            </p>
            <a
              href="https://ec.europa.eu/consumers/odr"
              className="text-blue-600 hover:underline inline-block"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://ec.europa.eu/consumers/odr
            </a>
            <p className="text-gray-700 leading-relaxed mt-2">
              Unsere E-Mail-Adresse finden Sie oben im Impressum.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Verbraucherstreitbeilegung / Universalschlichtungsstelle
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor
              einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
            <p className="text-sm text-gray-500 italic">
              (Falls Sie an einem Streitbeilegungsverfahren teilnehmen, passen Sie diesen
              Text entsprechend an)
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Haftung für Inhalte
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf
              diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis
              10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte
              oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu
              forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen
              nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine
              diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer
              konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden
              Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Haftung für Links
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte
              wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte
              auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist
              stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die
              verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche
              Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der
              Verlinkung nicht erkennbar.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne
              konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
              Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend
              entfernen.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              Urheberrecht
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen
              Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung,
              Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen
              des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen
              Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den
              privaten, nicht kommerziellen Gebrauch gestattet.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden,
              werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte
              Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine
              Urheberrechtsverletzung aufmerksam werden, bitten wir um einen
              entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir
              derartige Inhalte umgehend entfernen.
            </p>
          </section>

          <div className="border-t pt-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Weitere rechtliche Hinweise
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                <a
                  href="/allgemeine-geschaeftsbedingungen"
                  className="text-blue-600 hover:underline"
                >
                  Allgemeine Geschäftsbedingungen
                </a>
              </p>
              <p className="text-sm text-gray-600">
                <a href="/datenschutz" className="text-blue-600 hover:underline">
                  Datenschutzerklärung
                </a>
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-8">
            <p className="text-sm text-yellow-800">
              <strong>Hinweis:</strong> Bitte ersetzen Sie alle Platzhalter (markiert mit
              [ECKIGEN KLAMMERN]) mit Ihren tatsächlichen Unternehmensdaten. Bei Fragen
              zur rechtlichen Gestaltung konsultieren Sie bitte einen Rechtsanwalt.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
