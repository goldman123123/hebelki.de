import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { getBusinessForUser } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // Check if user has a business, redirect to onboarding if not
  const business = await getBusinessForUser(userId)
  if (!business) {
    redirect('/onboarding')
  }

  return <DashboardShell>{children}</DashboardShell>
}
