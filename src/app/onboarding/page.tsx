import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getBusinessForUser } from '@/lib/auth'
import Link from 'next/link'
import { Sparkles, Zap } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function OnboardingPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // If user already has a business, redirect to dashboard
  const business = await getBusinessForUser(userId)
  if (business) {
    redirect('/dashboard')
  }

  const t = await getTranslations('onboarding')

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-3 text-lg text-gray-600">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Guided Wizard */}
          <Link
            href="/onboarding/wizard"
            className="group relative overflow-hidden rounded-xl border-2 border-blue-200 bg-white p-8 shadow-sm transition-all hover:border-blue-400 hover:shadow-xl"
          >
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                {t('wizard.recommended')}
              </span>
            </div>

            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                <Sparkles className="w-8 h-8" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {t('wizard.title')}
            </h2>

            <p className="text-gray-600 mb-6">
              {t('wizard.description')}
            </p>

            <ul className="space-y-3 text-sm text-gray-600">
              {[t('wizard.feature1'), t('wizard.feature2'), t('wizard.feature3'), t('wizard.feature4'), t('wizard.feature5')].map((feature, i) => (
                <li key={i} className="flex items-start">
                  <span className="mr-2 text-green-600">&#10003;</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
              {t('wizard.cta')}
            </div>
          </Link>

          {/* Quick Setup */}
          <Link
            href="/onboarding/simple"
            className="group relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-8 shadow-sm transition-all hover:border-gray-400 hover:shadow-lg"
          >
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-600 group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {t('simple.title')}
            </h2>

            <p className="text-gray-600 mb-6">
              {t('simple.description')}
            </p>

            <ul className="space-y-3 text-sm text-gray-600">
              {[t('simple.feature1'), t('simple.feature2'), t('simple.feature3'), t('simple.feature4')].map((feature, i) => (
                <li key={i} className="flex items-start">
                  <span className="mr-2 text-gray-400">&#8226;</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center text-gray-600 font-semibold group-hover:translate-x-2 transition-transform">
              {t('simple.cta')}
            </div>
          </Link>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          {t('canChangeLater')}
        </p>
      </div>
    </div>
  )
}
