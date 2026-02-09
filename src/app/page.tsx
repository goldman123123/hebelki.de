import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { SignOutButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FAQAccordion } from '@/components/faq-accordion'
import {
  Calendar,
  Clock,
  Users,
  Zap,
  LogOut,
  MessageSquare,
  Bot,
  CheckCircle,
  Shield,
  Lock,
  Smartphone,
  Stethoscope,
  Scissors,
  Dumbbell,
  Brain,
  Mail,
  BookOpen,
  BarChart3,
  ArrowRight,
} from 'lucide-react'
import { DevUserSwitcherPublic } from '@/components/DevUserSwitcherPublic'

// Data structures
const stats = [
  { value: '1.000+', label: 'Termine gebucht' },
  { value: '90%', label: 'weniger Telefonanfragen' },
  { value: '5 Min', label: 'Setup-Zeit' },
]

const useCases = [
  {
    icon: Stethoscope,
    title: 'Physiotherapie',
    problem: '30+ WhatsApp-Nachrichten täglich?',
    solution: 'Ihr Chatbot beantwortet Fragen und bucht automatisch',
    metric: '3 Stunden/Woche gespart',
  },
  {
    icon: Scissors,
    title: 'Friseursalon',
    problem: 'Ständige Telefonanrufe während der Arbeit?',
    solution: 'Chat-Widget auf Ihrer Website – 24/7 erreichbar',
    metric: '-50% Telefonanrufe',
  },
  {
    icon: Dumbbell,
    title: 'Fitness & Beratung',
    problem: 'Keine Online-Buchung für Kurse?',
    solution: 'Kunden buchen Kurse selbst – ohne Anruf',
    metric: '+30% mehr Buchungen',
  },
]

const featuresCustomers = [
  {
    icon: Bot,
    title: 'KI-Chatbot',
    description: 'Beantwortet Fragen automatisch, bucht Termine',
  },
  {
    icon: Clock,
    title: '24/7 Buchung',
    description: 'Termine buchen wann es passt',
  },
  {
    icon: Smartphone,
    title: 'WhatsApp & Web',
    description: 'Dort wo Kunden bereits sind',
  },
  {
    icon: Mail,
    title: 'Automatische Bestätigungen',
    description: 'Per E-Mail und SMS',
  },
]

const featuresOwners = [
  {
    icon: Brain,
    title: 'Wissensdatenbank',
    description: 'KI lernt aus Ihrer Website automatisch',
  },
  {
    icon: Calendar,
    title: 'Google Kalender-Sync',
    description: 'Termine direkt im Kalender',
  },
  {
    icon: Users,
    title: 'Team-Verwaltung',
    description: 'Mehrere Mitarbeiter mit eigenen Zeiten',
  },
  {
    icon: BarChart3,
    title: 'Einfaches Dashboard',
    description: 'Buchungen, Kunden, Statistiken',
  },
]

const steps = [
  {
    icon: MessageSquare,
    title: 'Kunde schreibt',
    description: '"Hallo, ich brauche einen Termin für morgen um 14 Uhr"',
  },
  {
    icon: Bot,
    title: 'KI antwortet',
    description: 'Chatbot prüft Verfügbarkeit, bietet Slots an',
  },
  {
    icon: Calendar,
    title: 'Termin gebucht',
    description: 'Automatische Bestätigung per E-Mail + Erinnerung',
  },
]

const chatbotFeatures = [
  'Beantwortet FAQs automatisch',
  'Prüft Verfügbarkeit in Echtzeit',
  'Bucht Termine ohne Ihr Zutun',
  'Lernt aus Ihrer Website-Inhalte',
]

const pricingPlans = [
  {
    name: 'Kostenlos',
    price: '€0',
    period: 'für immer',
    features: ['1 Mitarbeiter', '50 Buchungen/Monat', 'KI-Chatbot inklusive'],
    cta: 'Starten',
    href: '/sign-up',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: '€19',
    period: '/Monat',
    features: ['3 Mitarbeiter', 'Unbegrenzte Buchungen', 'E-Mail-Support'],
    cta: 'Testen',
    href: '/sign-up',
    highlighted: true,
  },
  {
    name: 'Professional',
    price: '€49',
    period: '/Monat',
    features: ['Unbegrenzt Mitarbeiter', 'WhatsApp-Integration', 'Prioritäts-Support'],
    cta: 'Testen',
    href: '/sign-up',
    highlighted: false,
  },
]

const testimonials = [
  {
    quote: 'Der Chatbot beantwortet 90% meiner WhatsApp-Anfragen automatisch. Ich spare jeden Tag mindestens eine Stunde.',
    author: 'Marcus R.',
    role: 'Physiotherapeut',
  },
  {
    quote: 'Meine Kunden buchen jetzt 24/7 online. Die Telefonanrufe während der Arbeit sind fast komplett weg.',
    author: 'Julia K.',
    role: 'Friseurmeisterin',
  },
  {
    quote: 'Endlich eine Software, die wirklich Zeit spart. Setup hat keine 10 Minuten gedauert.',
    author: 'Thomas W.',
    role: 'Personal Trainer',
  },
]

const trustBadges = [
  { icon: Shield, label: 'DSGVO-konform' },
  { icon: Lock, label: 'SSL-verschlüsselt' },
  { icon: Zap, label: 'Keine Kreditkarte nötig' },
]

const faqs = [
  {
    question: 'Wie schwierig ist das Setup?',
    answer: '5 Minuten. Unsere KI scannt Ihre Website automatisch und lernt aus Ihren Inhalten. Sie müssen nur Ihre Dienstleistungen und Verfügbarkeit eingeben.',
  },
  {
    question: 'Funktioniert das wirklich auf WhatsApp?',
    answer: 'Ja, über die WhatsApp Business API. Ihre Kunden können direkt in WhatsApp mit Ihrem Chatbot chatten und Termine buchen. Testen Sie unsere Live-Demo.',
  },
  {
    question: 'Was wenn die KI nicht antworten kann?',
    answer: 'Komplexe Anfragen werden automatisch an Sie weitergeleitet. Sie erhalten eine Benachrichtigung und können direkt übernehmen.',
  },
  {
    question: 'Ist die KI im kostenlosen Plan enthalten?',
    answer: 'Ja, der Chatbot ist in allen Plänen inklusive – auch im kostenlosen. Sie bekommen die volle KI-Funktionalität ohne Aufpreis.',
  },
  {
    question: 'Wie wird der Chatbot auf mein Geschäft trainiert?',
    answer: 'Automatisch aus Ihrer Website, Services und FAQs. Sie können auch eigene Inhalte in der Wissensdatenbank hinzufügen. Sie haben volle Kontrolle über die Antworten.',
  },
  {
    question: 'Kann ich meine Daten exportieren?',
    answer: 'Ja, jederzeit. Alle Geschäftsdaten gehören Ihnen und können als CSV oder PDF exportiert werden.',
  },
]

export default async function Home() {
  const { userId } = await auth()
  const isLoggedIn = !!userId

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Hebelki</span>
          </Link>
          <div className="flex items-center gap-4">
            <DevUserSwitcherPublic />
            <Link href="/physioplus/chat" className="text-sm font-medium text-gray-600 hover:text-gray-900 hidden sm:block">
              Live-Demo
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Preise
            </Link>
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

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:py-28 text-center">
        <Badge variant="secondary" className="mb-6">
          <Bot className="h-3 w-3 mr-1" />
          KI-gestützte Terminbuchung
        </Badge>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900">
          Ihr KI-Assistent für
          <br />
          <span className="text-primary">Terminbuchungen</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-gray-600">
          Kunden buchen 24/7 per Chat – auf Ihrer Website oder WhatsApp.
          <br className="hidden sm:block" />
          Sparen Sie Stunden an Telefonzeit und WhatsApp-Nachrichten.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={isLoggedIn ? "/dashboard" : "/sign-up"}>
            <Button size="lg" className="text-lg w-full sm:w-auto">
              {isLoggedIn ? "Zum Dashboard" : "Kostenlos starten"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/physioplus/chat">
            <Button size="lg" variant="outline" className="text-lg w-full sm:w-auto">
              <MessageSquare className="mr-2 h-5 w-5" />
              Chatbot testen
            </Button>
          </Link>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="border-y bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="flex flex-col items-center">
                <span className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</span>
                <span className="text-gray-600 mt-1">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases / Pain Points */}
      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Für wen ist Hebelki?
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Jedes Dienstleistungsunternehmen, das Zeit mit Terminkoordination verschwendet
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {useCases.map((useCase, index) => (
              <Card key={index} className="relative overflow-hidden">
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <useCase.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{useCase.title}</h3>
                  <p className="text-gray-600 font-medium mb-2">{useCase.problem}</p>
                  <p className="text-gray-500 text-sm mb-4">{useCase.solution}</p>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {useCase.metric}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-white py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Alles, was Sie brauchen
          </h2>
          <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
            Eine komplette Lösung für Terminbuchung und Kundenkommunikation
          </p>

          {/* For Customers */}
          <div className="mb-12">
            <h3 className="text-lg font-semibold text-gray-500 mb-6 text-center">
              Für Ihre Kunden
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuresCustomers.map((feature, index) => (
                <div key={index} className="text-center p-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h4 className="font-semibold mb-1">{feature.title}</h4>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* For Owners */}
          <div>
            <h3 className="text-lg font-semibold text-gray-500 mb-6 text-center">
              Für Sie als Inhaber
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuresOwners.map((feature, index) => (
                <div key={index} className="text-center p-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h4 className="font-semibold mb-1">{feature.title}</h4>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            So funktioniert es
          </h2>
          <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
            Von der Anfrage bis zur Buchung – vollautomatisch
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={index} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white mb-4">
                  <step.icon className="h-8 w-8" />
                </div>
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 bg-primary text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                  {index + 1}
                </span>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+3rem)] w-[calc(100%-6rem)] h-0.5 bg-gray-200">
                    <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-300 h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Chatbot Showcase */}
      <section className="border-t bg-gradient-to-b from-primary/5 to-white py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">
                <MessageSquare className="h-3 w-3 mr-1" />
                KI-Chatbot
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Der Chatbot, der Ihre WhatsApp-Flut beendet
              </h2>
              <p className="text-gray-600 mb-6">
                Ihr persönlicher KI-Assistent beantwortet Kundenanfragen, prüft Verfügbarkeiten
                und bucht Termine – rund um die Uhr, ohne Ihr Zutun.
              </p>
              <ul className="space-y-3 mb-8">
                {chatbotFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/physioplus/chat">
                <Button size="lg">
                  Jetzt live testen
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <div className="relative">
              <Card className="shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">PhysioPlus Assistent</p>
                      <p className="text-sm text-green-600">Online</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <div className="bg-primary text-white rounded-lg rounded-br-none px-4 py-2 max-w-[80%]">
                        Hallo, ich brauche einen Termin für morgen
                      </div>
                    </div>
                    <div className="flex">
                      <div className="bg-gray-100 rounded-lg rounded-bl-none px-4 py-2 max-w-[80%]">
                        Gerne! Für welche Behandlung möchten Sie einen Termin buchen?
                        Wir haben folgende Slots morgen verfügbar: 9:00, 11:30, 14:00
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-primary text-white rounded-lg rounded-br-none px-4 py-2 max-w-[80%]">
                        14:00 wäre perfekt, Sportphysiotherapie bitte
                      </div>
                    </div>
                    <div className="flex">
                      <div className="bg-gray-100 rounded-lg rounded-bl-none px-4 py-2 max-w-[80%]">
                        <CheckCircle className="h-4 w-4 text-green-500 inline mr-1" />
                        Termin gebucht! Morgen um 14:00 Uhr für Sportphysiotherapie.
                        Sie erhalten eine Bestätigung per E-Mail.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="absolute -bottom-4 -right-4 bg-green-500 text-white text-sm font-medium px-3 py-1 rounded-full shadow-lg">
                Automatisch gebucht!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="border-t py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Einfache, faire Preise
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Starten Sie kostenlos. Upgraden Sie wenn Sie wachsen.
          </p>
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`relative ${plan.highlighted ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Beliebt
                  </Badge>
                )}
                <CardContent className="pt-6 text-center">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 mb-6 text-sm">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center justify-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.href}>
                    <Button
                      variant={plan.highlighted ? 'default' : 'outline'}
                      className="w-full"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/pricing" className="text-primary hover:underline font-medium">
              Alle Pläne vergleichen →
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t bg-white py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl md:text-4xl font-bold text-gray-900 mb-12">
            Das sagen unsere Kunden
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className="h-5 w-5 text-yellow-400 fill-current"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="text-gray-700 mb-4">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                      {testimonial.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="border-t py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap justify-center gap-8 md:gap-12">
            {trustBadges.map((badge, index) => (
              <div key={index} className="flex items-center gap-2 text-gray-600">
                <badge.icon className="h-5 w-5" />
                <span className="font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t bg-white py-20 md:py-24">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-center text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Häufige Fragen
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Haben Sie weitere Fragen? Kontaktieren Sie uns.
          </p>
          <FAQAccordion faqs={faqs} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-24 bg-primary">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Bereit, Ihre Terminverwaltung zu automatisieren?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Starten Sie kostenlos – keine Kreditkarte erforderlich.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={isLoggedIn ? "/dashboard" : "/sign-up"}>
              <Button size="lg" variant="secondary" className="text-lg w-full sm:w-auto">
                {isLoggedIn ? "Zum Dashboard" : "Kostenlos starten"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/physioplus/chat">
              <Button
                size="lg"
                variant="outline"
                className="text-lg w-full sm:w-auto bg-transparent text-white border-white hover:bg-white/10"
              >
                <MessageSquare className="mr-2 h-5 w-5" />
                Live-Demo testen
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 md:grid-cols-4">
            {/* Logo & Tagline */}
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="text-xl font-bold">Hebelki</span>
              </Link>
              <p className="text-sm text-gray-500">
                KI-gestützte Terminbuchung für Dienstleister
              </p>
            </div>

            {/* Produkt */}
            <div>
              <h4 className="font-semibold mb-4">Produkt</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/pricing" className="hover:text-gray-900">Funktionen</Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-gray-900">Preise</Link>
                </li>
                <li>
                  <Link href="/physioplus/chat" className="hover:text-gray-900">Demo</Link>
                </li>
              </ul>
            </div>

            {/* Rechtliches */}
            <div>
              <h4 className="font-semibold mb-4">Rechtliches</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/datenschutz" className="hover:text-gray-900">Datenschutz</Link>
                </li>
                <li>
                  <Link href="/impressum" className="hover:text-gray-900">Impressum</Link>
                </li>
                <li>
                  <Link href="/agb" className="hover:text-gray-900">AGB</Link>
                </li>
              </ul>
            </div>

            {/* Kontakt */}
            <div>
              <h4 className="font-semibold mb-4">Kontakt</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="mailto:support@hebelki.de" className="hover:text-gray-900">
                    support@hebelki.de
                  </a>
                </li>
                <li>
                  <Link href="/physioplus/chat" className="hover:text-gray-900">
                    Chat-Support
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Hebelki. Alle Rechte vorbehalten.
          </div>
        </div>
      </footer>
    </div>
  )
}
