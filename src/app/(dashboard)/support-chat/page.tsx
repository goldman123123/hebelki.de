import { requireBusinessAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SupportChatDashboard } from './components/SupportChatDashboard'

export default async function SupportChatPage() {
  const authResult = await requireBusinessAuth()

  if (!authResult.success) {
    redirect('/sign-in')
  }

  return (
    <SupportChatDashboard
      businessId={authResult.business.id}
      businessName={authResult.business.name}
    />
  )
}
