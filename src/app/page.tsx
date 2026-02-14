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
import { getTranslations } from 'next-intl/server'

export default async function Home() {
  const { userId } = await auth()
  const isLoggedIn = !!userId
  const t = await getTranslations('landing')
  const tNav = await getTranslations('nav')

  // Data structures
  const stats = [
    { value: '1.000+', label: t('stats.booked') },
    { value: '90%', label: t('stats.calls') },
    { value: '5 Min', label: t('stats.setup') },
  ]

  const useCases = [
    {
      icon: Stethoscope,
      title: t('useCases.physio.title'),
      problem: t('useCases.physio.problem'),
      solution: t('useCases.physio.solution'),
      metric: t('useCases.physio.metric'),
    },
    {
      icon: Scissors,
      title: t('useCases.salon.title'),
      problem: t('useCases.salon.problem'),
      solution: t('useCases.salon.solution'),
      metric: t('useCases.salon.metric'),
    },
    {
      icon: Dumbbell,
      title: t('useCases.fitness.title'),
      problem: t('useCases.fitness.problem'),
      solution: t('useCases.fitness.solution'),
      metric: t('useCases.fitness.metric'),
    },
  ]

  const featuresCustomers = [
    {
      icon: Bot,
      title: t('features.chatbot'),
      description: t('features.chatbotDesc'),
    },
    {
      icon: Clock,
      title: t('features.booking247'),
      description: t('features.booking247Desc'),
    },
    {
      icon: Smartphone,
      title: t('features.channels'),
      description: t('features.channelsDesc'),
    },
    {
      icon: Mail,
      title: t('features.confirmations'),
      description: t('features.confirmationsDesc'),
    },
  ]

  const featuresOwners = [
    {
      icon: Brain,
      title: t('features.knowledgeBase'),
      description: t('features.knowledgeBaseDesc'),
    },
    {
      icon: Calendar,
      title: t('features.calendarSync'),
      description: t('features.calendarSyncDesc'),
    },
    {
      icon: Users,
      title: t('features.teamMgmt'),
      description: t('features.teamMgmtDesc'),
    },
    {
      icon: BarChart3,
      title: t('features.dashboard'),
      description: t('features.dashboardDesc'),
    },
  ]

  const steps = [
    {
      icon: MessageSquare,
      title: t('howItWorks.step1Title'),
      description: t('howItWorks.step1Desc'),
    },
    {
      icon: Bot,
      title: t('howItWorks.step2Title'),
      description: t('howItWorks.step2Desc'),
    },
    {
      icon: Calendar,
      title: t('howItWorks.step3Title'),
      description: t('howItWorks.step3Desc'),
    },
  ]

  const chatbotFeatures = [
    t('chatbotShowcase.feature1'),
    t('chatbotShowcase.feature2'),
    t('chatbotShowcase.feature3'),
    t('chatbotShowcase.feature4'),
  ]

  const pricingPlans = [
    {
      name: t('pricingTeaser.free.name'),
      price: t('pricingTeaser.free.price'),
      period: t('pricingTeaser.free.period'),
      features: [t('pricingTeaser.free.feature1'), t('pricingTeaser.free.feature2'), t('pricingTeaser.free.feature3')],
      cta: t('pricingTeaser.free.cta'),
      href: '/sign-up',
      highlighted: false,
    },
    {
      name: t('pricingTeaser.starter.name'),
      price: t('pricingTeaser.starter.price'),
      period: t('pricingTeaser.starter.period'),
      features: [t('pricingTeaser.starter.feature1'), t('pricingTeaser.starter.feature2'), t('pricingTeaser.starter.feature3')],
      cta: t('pricingTeaser.starter.cta'),
      href: '/sign-up',
      highlighted: true,
    },
    {
      name: t('pricingTeaser.professional.name'),
      price: t('pricingTeaser.professional.price'),
      period: t('pricingTeaser.professional.period'),
      features: [t('pricingTeaser.professional.feature1'), t('pricingTeaser.professional.feature2'), t('pricingTeaser.professional.feature3')],
      cta: t('pricingTeaser.professional.cta'),
      href: '/sign-up',
      highlighted: false,
    },
  ]

  const testimonials = [
    {
      quote: t('testimonials.quote1'),
      author: t('testimonials.author1'),
      role: t('testimonials.role1'),
    },
    {
      quote: t('testimonials.quote2'),
      author: t('testimonials.author2'),
      role: t('testimonials.role2'),
    },
    {
      quote: t('testimonials.quote3'),
      author: t('testimonials.author3'),
      role: t('testimonials.role3'),
    },
  ]

  const trustBadges = [
    { icon: Shield, label: t('trust.gdpr') },
    { icon: Lock, label: t('trust.ssl') },
    { icon: Zap, label: t('trust.noCreditCard') },
  ]

  const faqs = [
    { question: t('faq.q1'), answer: t('faq.a1') },
    { question: t('faq.q2'), answer: t('faq.a2') },
    { question: t('faq.q3'), answer: t('faq.a3') },
    { question: t('faq.q4'), answer: t('faq.a4') },
    { question: t('faq.q5'), answer: t('faq.a5') },
    { question: t('faq.q6'), answer: t('faq.a6') },
  ]

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
            <Link href="/demo" className="text-sm font-medium text-gray-600 hover:text-gray-900 hidden sm:block">
              {tNav('demo')}
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              {tNav('pricing')}
            </Link>
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

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:py-28 text-center">
        <Badge variant="secondary" className="mb-6">
          <Bot className="h-3 w-3 mr-1" />
          {t('heroBadge')}
        </Badge>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900">
          {t('heroTitle1')}
          <br />
          <span className="text-primary">{t('heroTitle2')}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-gray-600">
          {t('heroDescription1')}
          <br className="hidden sm:block" />
          {t('heroDescription2')}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={isLoggedIn ? "/dashboard" : "/sign-up"}>
            <Button size="lg" className="text-lg w-full sm:w-auto">
              {isLoggedIn ? t('heroCtaLoggedIn') : t('heroCta')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/demo">
            <Button size="lg" variant="outline" className="text-lg w-full sm:w-auto">
              <MessageSquare className="mr-2 h-5 w-5" />
              {t('heroDemo')}
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
            {t('useCases.title')}
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            {t('useCases.subtitle')}
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
            {t('features.title')}
          </h2>
          <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
            {t('features.subtitle')}
          </p>

          {/* For Customers */}
          <div className="mb-12">
            <h3 className="text-lg font-semibold text-gray-500 mb-6 text-center">
              {t('features.forCustomers')}
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
              {t('features.forOwners')}
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
            {t('howItWorks.title')}
          </h2>
          <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
            {t('howItWorks.subtitle')}
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
                {t('chatbotShowcase.badge')}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {t('chatbotShowcase.title')}
              </h2>
              <p className="text-gray-600 mb-6">
                {t('chatbotShowcase.description')}
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
                  {t('chatbotShowcase.cta')}
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
                      <p className="font-semibold">{t('chatbotShowcase.assistantName')}</p>
                      <p className="text-sm text-green-600">{t('chatbotShowcase.online')}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <div className="bg-primary text-white rounded-lg rounded-br-none px-4 py-2 max-w-[80%]">
                        {t('chatbotShowcase.chatMsg1')}
                      </div>
                    </div>
                    <div className="flex">
                      <div className="bg-gray-100 rounded-lg rounded-bl-none px-4 py-2 max-w-[80%]">
                        {t('chatbotShowcase.chatMsg2')}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-primary text-white rounded-lg rounded-br-none px-4 py-2 max-w-[80%]">
                        {t('chatbotShowcase.chatMsg3')}
                      </div>
                    </div>
                    <div className="flex">
                      <div className="bg-gray-100 rounded-lg rounded-bl-none px-4 py-2 max-w-[80%]">
                        <CheckCircle className="h-4 w-4 text-green-500 inline mr-1" />
                        {t('chatbotShowcase.chatMsg4')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="absolute -bottom-4 -right-4 bg-green-500 text-white text-sm font-medium px-3 py-1 rounded-full shadow-lg">
                {t('chatbotShowcase.autoBooked')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="border-t py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('pricingTeaser.title')}
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            {t('pricingTeaser.subtitle')}
          </p>
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`relative ${plan.highlighted ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    {t('pricingTeaser.popular')}
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
              {t('pricingTeaser.comparePlans')}
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t bg-white py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl md:text-4xl font-bold text-gray-900 mb-12">
            {t('testimonials.title')}
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
            {t('faq.title')}
          </h2>
          <p className="text-center text-gray-600 mb-12">
            {t('faq.subtitle')}
          </p>
          <FAQAccordion faqs={faqs} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-24 bg-primary">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t('finalCta.title')}
          </h2>
          <p className="text-xl text-white/80 mb-8">
            {t('finalCta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={isLoggedIn ? "/dashboard" : "/sign-up"}>
              <Button size="lg" variant="secondary" className="text-lg w-full sm:w-auto">
                {isLoggedIn ? t('heroCtaLoggedIn') : t('heroCta')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button
                size="lg"
                variant="outline"
                className="text-lg w-full sm:w-auto bg-transparent text-white border-white hover:bg-white/10"
              >
                <MessageSquare className="mr-2 h-5 w-5" />
                {t('heroDemo')}
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
                {t('footer.tagline')}
              </p>
            </div>

            {/* Produkt */}
            <div>
              <h4 className="font-semibold mb-4">{t('footer.product')}</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/pricing" className="hover:text-gray-900">{t('footer.features')}</Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-gray-900">{t('footer.pricing')}</Link>
                </li>
                <li>
                  <Link href="/physioplus/chat" className="hover:text-gray-900">{t('footer.demo')}</Link>
                </li>
              </ul>
            </div>

            {/* Rechtliches */}
            <div>
              <h4 className="font-semibold mb-4">{t('footer.legal')}</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/datenschutz" className="hover:text-gray-900">{t('footer.privacy')}</Link>
                </li>
                <li>
                  <Link href="/impressum" className="hover:text-gray-900">{t('footer.imprint')}</Link>
                </li>
                <li>
                  <Link href="/agb" className="hover:text-gray-900">{t('footer.terms')}</Link>
                </li>
                <li>
                  <Link href="/legal/dpia" className="hover:text-gray-900">{t('footer.dpia')}</Link>
                </li>
                <li>
                  <Link href="/legal/ai-usage" className="hover:text-gray-900">{t('footer.aiUsage')}</Link>
                </li>
              </ul>
            </div>

            {/* Kontakt */}
            <div>
              <h4 className="font-semibold mb-4">{t('footer.contact')}</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="mailto:support@hebelki.de" className="hover:text-gray-900">
                    support@hebelki.de
                  </a>
                </li>
                <li>
                  <Link href="/physioplus/chat" className="hover:text-gray-900">
                    {t('footer.chatSupport')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} {t('footer.copyright')}
          </div>
        </div>
      </footer>
    </div>
  )
}
