import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isPlatformAdminId } from '@/lib/platform-auth'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId || !isPlatformAdminId(userId)) redirect('/')
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-purple-700 text-white px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Hebelki Platform Admin</h1>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
