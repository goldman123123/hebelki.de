import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Hebelki</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/demo" className="text-sm font-medium text-gray-600 hover:text-gray-900 hidden sm:block">
              Demo
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Preise
            </Link>
            <Link href="/sign-in">
              <Button variant="ghost">Anmelden</Button>
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
