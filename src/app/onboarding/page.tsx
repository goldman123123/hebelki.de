import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getBusinessForUser } from '@/lib/auth'
import { OnboardingForm } from './OnboardingForm'

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Hebelki</h1>
          <p className="mt-2 text-gray-600">
            Let's set up your business so you can start accepting bookings.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  )
}
