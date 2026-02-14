import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { SignOutButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Check, LogOut } from 'lucide-react'
import { DevUserSwitcherPublic } from '@/components/DevUserSwitcherPublic'
import { getTranslations } from 'next-intl/server'

export default async function PricingPage() {
  const { userId } = await auth()
  const isLoggedIn = !!userId
  const t = await getTranslations('pricing')
  const tNav = await getTranslations('nav')

  const tiers = [
    {
      name: t('free.name'),
      planId: 'free',
      price: t('free.price'),
      period: t('free.period'),
      description: t('free.description'),
      features: t.raw('free.features') as string[],
      limitations: t.raw('free.limitations') as string[],
      cta: t('free.cta'),
      ctaLoggedIn: t('free.ctaLoggedIn'),
      ctaVariant: 'outline' as const,
      popular: false,
    },
    {
      name: t('starter.name'),
      planId: 'starter',
      price: t('starter.price'),
      period: t('starter.period'),
      description: t('starter.description'),
      features: t.raw('starter.features') as string[],
      limitations: [] as string[],
      cta: t('starter.cta'),
      ctaLoggedIn: t('starter.ctaLoggedIn'),
      ctaVariant: 'outline' as const,
      popular: false,
    },
    {
      name: t('professional.name'),
      planId: 'pro',
      price: t('professional.price'),
      period: t('professional.period'),
      description: t('professional.description'),
      features: t.raw('professional.features') as string[],
      limitations: [] as string[],
      cta: t('professional.cta'),
      ctaLoggedIn: t('professional.ctaLoggedIn'),
      ctaVariant: 'default' as const,
      popular: true,
    },
    {
      name: t('business.name'),
      planId: 'business',
      price: t('business.price'),
      period: t('business.period'),
      description: t('business.description'),
      features: t.raw('business.features') as string[],
      limitations: [] as string[],
      cta: t('business.cta'),
      ctaLoggedIn: t('business.ctaLoggedIn'),
      ctaVariant: 'outline' as const,
      popular: false,
    },
  ]

  const comparisonFeatures = [
    { name: t('comparison.employees'), free: '1', starter: '3', professional: t('comparison.unlimited'), business: t('comparison.unlimited') },
    { name: t('comparison.bookingsMonth'), free: '50', starter: t('comparison.unlimited'), professional: t('comparison.unlimited'), business: t('comparison.unlimited') },
    { name: t('comparison.emailConfirmations'), free: true, starter: true, professional: true, business: true },
    { name: t('comparison.smsReminders'), free: false, starter: true, professional: true, business: true },
    { name: t('comparison.removeBranding'), free: false, starter: true, professional: true, business: true },
    { name: t('comparison.customColors'), free: false, starter: true, professional: true, business: true },
    { name: t('comparison.googleCalendar'), free: false, starter: false, professional: true, business: true },
    { name: t('comparison.customDomain'), free: false, starter: false, professional: true, business: true },
    { name: t('comparison.whitelabelEmail'), free: false, starter: false, professional: true, business: true },
    { name: t('comparison.stripePayments'), free: false, starter: false, professional: true, business: true },
    { name: t('comparison.waitlist'), free: false, starter: false, professional: true, business: true },
    { name: t('comparison.apiAccess'), free: false, starter: false, professional: true, business: true },
    { name: t('comparison.multipleLocations'), free: false, starter: false, professional: false, business: true },
    { name: t('comparison.teamRoles'), free: false, starter: false, professional: false, business: true },
    { name: t('comparison.webhooks'), free: false, starter: false, professional: false, business: true },
    { name: t('comparison.prioritySupport'), free: false, starter: false, professional: true, business: true },
    { name: t('comparison.personalContact'), free: false, starter: false, professional: false, business: true },
  ]

  const faqs = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    { q: t('faq.q5'), a: t('faq.a5') },
    { q: t('faq.q6'), a: t('faq.a6') },
  ]

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
                  <Button>{tNav('dashboard')}</Button>
                </Link>
                <SignOutButton>
                  <Button variant="ghost" size="sm">
                    <LogOut className="h-4 w-4 mr-2" />
                    {tNav('signOut')}
                  </Button>
                </SignOutButton>
              </>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost">{tNav('signIn')}</Button>
                </Link>
                <Link href="/sign-up">
                  <Button>{tNav('signUp')}</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          {t('heroTitle')}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-xl text-gray-600">
          {t('heroSubtitle')}
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
                  {t('popularBadge')}
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
            {t('comparison.title')}
          </h2>
          <p className="mt-2 text-center text-gray-600">
            {t('comparison.subtitle')}
          </p>

          <div className="mt-12 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-4 text-left font-semibold">{t('comparison.feature')}</th>
                  <th className="py-4 text-center font-semibold">{t('free.name')}</th>
                  <th className="py-4 text-center font-semibold">{t('starter.name')}</th>
                  <th className="py-4 text-center font-semibold text-primary">{t('professional.name')}</th>
                  <th className="py-4 text-center font-semibold">{t('business.name')}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature) => (
                  <tr key={feature.name} className="border-b">
                    <td className="py-4 text-sm">{feature.name}</td>
                    <td className="py-4 text-center text-sm">
                      {typeof feature.free === 'boolean' ? (
                        feature.free ? <Check className="mx-auto h-5 w-5 text-green-500" /> : <span className="text-gray-300">&mdash;</span>
                      ) : (
                        feature.free
                      )}
                    </td>
                    <td className="py-4 text-center text-sm">
                      {typeof feature.starter === 'boolean' ? (
                        feature.starter ? <Check className="mx-auto h-5 w-5 text-green-500" /> : <span className="text-gray-300">&mdash;</span>
                      ) : (
                        feature.starter
                      )}
                    </td>
                    <td className="py-4 text-center text-sm bg-primary/5">
                      {typeof feature.professional === 'boolean' ? (
                        feature.professional ? <Check className="mx-auto h-5 w-5 text-green-500" /> : <span className="text-gray-300">&mdash;</span>
                      ) : (
                        feature.professional
                      )}
                    </td>
                    <td className="py-4 text-center text-sm">
                      {typeof feature.business === 'boolean' ? (
                        feature.business ? <Check className="mx-auto h-5 w-5 text-green-500" /> : <span className="text-gray-300">&mdash;</span>
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
            {t('faq.title')}
          </h2>
          <div className="mt-12 space-y-8">
            {faqs.map((faq, index) => (
              <div key={index}>
                <h3 className="font-semibold">{faq.q}</h3>
                <p className="mt-2 text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary/5 py-16">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            {isLoggedIn ? t('cta.titleLoggedIn') : t('cta.titleLoggedOut')}
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            {isLoggedIn ? t('cta.subtitleLoggedIn') : t('cta.subtitleLoggedOut')}
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href={isLoggedIn ? "/unternehmen" : "/sign-up"}>
              <Button size="lg" className="text-lg">
                {isLoggedIn ? t('cta.buttonLoggedIn') : t('cta.buttonLoggedOut')}
              </Button>
            </Link>
            <Link href="/book/physioplus">
              <Button size="lg" variant="outline" className="text-lg">
                {t('cta.viewDemo')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} {t('footer')}
        </div>
      </footer>
    </div>
  )
}
