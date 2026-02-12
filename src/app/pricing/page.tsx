import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { SignOutButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Check, LogOut } from 'lucide-react'
import { DevUserSwitcherPublic } from '@/components/DevUserSwitcherPublic'

const tiers = [
  {
    name: 'Kostenlos',
    planId: 'free',
    price: '€0',
    period: 'für immer',
    description: 'Perfekt zum Ausprobieren von Hebelki',
    features: [
      '1 Mitarbeiter',
      '50 Buchungen/Monat',
      'E-Mail-Bestätigungen',
      'Einfache Buchungsseite',
      'hebelki.de/book/slug URL',
    ],
    limitations: [
      'Hebelki-Branding',
    ],
    cta: 'Jetzt starten',
    ctaLoggedIn: 'Aktueller Tarif',
    ctaVariant: 'outline' as const,
    popular: false,
  },
  {
    name: 'Starter',
    planId: 'starter',
    price: '€19',
    period: '/Monat',
    description: 'Für kleine Unternehmen, die durchstarten',
    features: [
      'Bis zu 3 Mitarbeiter',
      'Unbegrenzte Buchungen',
      'E-Mail- & SMS-Erinnerungen',
      'Hebelki-Branding entfernen',
      'Eigene Farben & Logo',
      'Kundenverwaltung',
      'Basis-Analysen',
    ],
    limitations: [],
    cta: 'Kostenlos testen',
    ctaLoggedIn: 'Upgraden',
    ctaVariant: 'outline' as const,
    popular: false,
  },
  {
    name: 'Professional',
    planId: 'pro',
    price: '€49',
    period: '/Monat',
    description: 'Für wachsende Unternehmen mit höheren Ansprüchen',
    features: [
      'Unbegrenzte Mitarbeiter',
      'Alles aus Starter, plus:',
      'Google Kalender-Sync',
      'Eigene Domain (termine.ihrfirma.de)',
      'E-Mails von Ihrer Domain senden',
      'Stripe-Zahlungen & Anzahlungen',
      'Wartelisten-Verwaltung',
      'API-Zugang',
      'Prioritäts-Support',
    ],
    limitations: [],
    cta: 'Kostenlos testen',
    ctaLoggedIn: 'Upgraden',
    ctaVariant: 'default' as const,
    popular: true,
  },
  {
    name: 'Business',
    planId: 'business',
    price: '€99',
    period: '/Monat',
    description: 'Für Unternehmen mit mehreren Standorten',
    features: [
      'Alles aus Professional, plus:',
      'Mehrere Standorte',
      'Team-Verwaltung & Rollen',
      'Erweiterte Analysen & Berichte',
      'Webhooks & Integrationen',
      'Persönlicher Ansprechpartner',
      'Individuelles Onboarding',
      'SLA-Garantie',
    ],
    limitations: [],
    cta: 'Vertrieb kontaktieren',
    ctaLoggedIn: 'Upgraden',
    ctaVariant: 'outline' as const,
    popular: false,
  },
]

const comparisonFeatures = [
  { name: 'Mitarbeiter', free: '1', starter: '3', professional: 'Unbegrenzt', business: 'Unbegrenzt' },
  { name: 'Buchungen/Monat', free: '50', starter: 'Unbegrenzt', professional: 'Unbegrenzt', business: 'Unbegrenzt' },
  { name: 'E-Mail-Bestätigungen', free: true, starter: true, professional: true, business: true },
  { name: 'SMS-Erinnerungen', free: false, starter: true, professional: true, business: true },
  { name: 'Branding entfernen', free: false, starter: true, professional: true, business: true },
  { name: 'Eigene Farben & Logo', free: false, starter: true, professional: true, business: true },
  { name: 'Google Kalender-Sync', free: false, starter: false, professional: true, business: true },
  { name: 'Eigene Domain', free: false, starter: false, professional: true, business: true },
  { name: 'White-Label E-Mail', free: false, starter: false, professional: true, business: true },
  { name: 'Stripe-Zahlungen', free: false, starter: false, professional: true, business: true },
  { name: 'Warteliste', free: false, starter: false, professional: true, business: true },
  { name: 'API-Zugang', free: false, starter: false, professional: true, business: true },
  { name: 'Mehrere Standorte', free: false, starter: false, professional: false, business: true },
  { name: 'Team-Rollen', free: false, starter: false, professional: false, business: true },
  { name: 'Webhooks', free: false, starter: false, professional: false, business: true },
  { name: 'Prioritäts-Support', free: false, starter: false, professional: true, business: true },
  { name: 'Persönlicher Ansprechpartner', free: false, starter: false, professional: false, business: true },
]

export default async function PricingPage() {
  const { userId } = await auth()
  const isLoggedIn = !!userId

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Hebelki</span>
          </Link>
          <div className="flex items-center gap-4">
            <DevUserSwitcherPublic />
            {isLoggedIn ? (
              <>
                <Link href="/dashboard">
                  <Button>Dashboard</Button>
                </Link>
                <SignOutButton>
                  <Button variant="ghost" size="sm">
                    <LogOut className="h-4 w-4 mr-2" />
                    Abmelden
                  </Button>
                </SignOutButton>
              </>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost">Anmelden</Button>
                </Link>
                <Link href="/sign-up">
                  <Button>Jetzt starten</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Einfache, transparente Preise
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-xl text-gray-600">
          Starten Sie kostenlos und wachsen Sie mit uns. Keine versteckten Gebühren.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative flex flex-col ${tier.popular ? 'border-primary border-2 shadow-lg' : ''}`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Beliebteste Wahl
                </Badge>
              )}
              <CardHeader className="text-center">
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <div className="mt-2">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-gray-500">{tier.period}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{tier.description}</p>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 shrink-0 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {tier.limitations.map((limitation) => (
                    <li key={limitation} className="flex items-start gap-2 text-gray-400">
                      <span className="h-5 w-5 shrink-0 text-center">-</span>
                      <span className="text-sm">{limitation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Link
                  href={isLoggedIn
                    ? (tier.planId === 'free' ? '/unternehmen' : `/unternehmen?billing=upgrade`)
                    : '/sign-up'}
                  className="w-full"
                >
                  <Button variant={tier.ctaVariant} className="w-full">
                    {isLoggedIn ? tier.ctaLoggedIn : tier.cta}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="border-t bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Tarife vergleichen
          </h2>
          <p className="mt-2 text-center text-gray-600">
            Finden Sie den passenden Tarif für Ihr Unternehmen
          </p>

          <div className="mt-12 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-4 text-left font-semibold">Funktion</th>
                  <th className="py-4 text-center font-semibold">Kostenlos</th>
                  <th className="py-4 text-center font-semibold">Starter</th>
                  <th className="py-4 text-center font-semibold text-primary">Professional</th>
                  <th className="py-4 text-center font-semibold">Business</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature) => (
                  <tr key={feature.name} className="border-b">
                    <td className="py-4 text-sm">{feature.name}</td>
                    <td className="py-4 text-center text-sm">
                      {typeof feature.free === 'boolean' ? (
                        feature.free ? <Check className="mx-auto h-5 w-5 text-green-500" /> : <span className="text-gray-300">—</span>
                      ) : (
                        feature.free
                      )}
                    </td>
                    <td className="py-4 text-center text-sm">
                      {typeof feature.starter === 'boolean' ? (
                        feature.starter ? <Check className="mx-auto h-5 w-5 text-green-500" /> : <span className="text-gray-300">—</span>
                      ) : (
                        feature.starter
                      )}
                    </td>
                    <td className="py-4 text-center text-sm bg-primary/5">
                      {typeof feature.professional === 'boolean' ? (
                        feature.professional ? <Check className="mx-auto h-5 w-5 text-green-500" /> : <span className="text-gray-300">—</span>
                      ) : (
                        feature.professional
                      )}
                    </td>
                    <td className="py-4 text-center text-sm">
                      {typeof feature.business === 'boolean' ? (
                        feature.business ? <Check className="mx-auto h-5 w-5 text-green-500" /> : <span className="text-gray-300">—</span>
                      ) : (
                        feature.business
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Häufig gestellte Fragen
          </h2>
          <div className="mt-12 space-y-8">
            <div>
              <h3 className="font-semibold">Kann ich jederzeit den Tarif wechseln?</h3>
              <p className="mt-2 text-gray-600">
                Ja! Sie können jederzeit upgraden oder downgraden. Bei einem Upgrade erhalten Sie sofort Zugang zu neuen Funktionen. Bei einem Downgrade werden die Änderungen zum nächsten Abrechnungszeitraum wirksam.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Gibt es eine kostenlose Testphase?</h3>
              <p className="mt-2 text-gray-600">
                Alle kostenpflichtigen Tarife beinhalten eine 14-tägige kostenlose Testphase. Keine Kreditkarte erforderlich. Sie können den kostenlosen Tarif auch unbegrenzt nutzen.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Welche Zahlungsmethoden akzeptieren Sie?</h3>
              <p className="mt-2 text-gray-600">
                Wir akzeptieren alle gängigen Kreditkarten (Visa, Mastercard, American Express) über Stripe. Jahrestarife können auch per Rechnung bezahlt werden.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Gibt es Rabatte bei jährlicher Zahlung?</h3>
              <p className="mt-2 text-gray-600">
                Ja! Sparen Sie 20% bei jährlicher Zahlung. Das sind 2 Monate gratis im Vergleich zur monatlichen Zahlung.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Was passiert, wenn ich meine Limits überschreite?</h3>
              <p className="mt-2 text-gray-600">
                Im kostenlosen Tarif können Sie keine neuen Buchungen mehr annehmen, sobald Sie 50/Monat erreicht haben. Wir benachrichtigen Sie rechtzeitig, damit Sie bei Bedarf upgraden können.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Kann ich jederzeit kündigen?</h3>
              <p className="mt-2 text-gray-600">
                Selbstverständlich. Keine Verträge, keine Kündigungsgebühren. Sie können Ihr Abonnement jederzeit kündigen und den Service bis zum Ende Ihres Abrechnungszeitraums weiter nutzen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary/5 py-16">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            {isLoggedIn ? "Tarif upgraden" : "Bereit loszulegen?"}
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            {isLoggedIn ? "Wählen Sie den Tarif, der zu Ihrem Unternehmen passt" : "Schließen Sie sich tausenden Unternehmen an, die Hebelki für ihre Terminverwaltung nutzen"}
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href={isLoggedIn ? "/unternehmen" : "/sign-up"}>
              <Button size="lg" className="text-lg">
                {isLoggedIn ? "Tarif verwalten" : "Kostenlos testen"}
              </Button>
            </Link>
            <Link href="/book/physioplus">
              <Button size="lg" variant="outline" className="text-lg">
                Demo ansehen
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Hebelki. Alle Rechte vorbehalten.
        </div>
      </footer>
    </div>
  )
}
