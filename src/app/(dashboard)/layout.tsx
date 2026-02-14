import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { getBusinessForUser } from '@/lib/auth'
import { isPlatformAdminId } from '@/lib/platform-auth'
import { PlatformExitButton } from '@/components/dashboard/PlatformExitButton'

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

  const isPlatformAdmin = isPlatformAdminId(userId)

  // Check if viewing as platform admin
  const cookieStore = await cookies()
  const platformBusinessId = cookieStore.get('hebelki_platform_business_id')?.value
  const showPlatformBanner = isPlatformAdmin && !!platformBusinessId

  const banner = showPlatformBanner ? (
    <div className="bg-purple-700 text-white px-4 py-2 flex items-center justify-between text-sm">
      <span>
        Platform Admin — Viewing: <strong>{business.name}</strong>
      </span>
      <PlatformExitButton />
    </div>
  ) : null

  return (
    <DashboardShell isPlatformAdmin={isPlatformAdmin} banner={banner}>
      {children}
    </DashboardShell>
  )
}
