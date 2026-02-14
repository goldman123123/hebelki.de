import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getBusinessForUser } from '@/lib/auth'
import { OnboardingForm } from '../OnboardingForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function SimpleOnboardingPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // If user already has a business, redirect to dashboard
  const business = await getBusinessForUser(userId)
  if (business) {
    redirect('/dashboard')
  }

  const t = await getTranslations('onboarding.simple')

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Link
          href="/onboarding"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t('backToOptions')}
        </Link>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{t('pageTitle')}</h1>
          <p className="mt-2 text-gray-600">
            {t('pageSubtitle')}
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  )
}
