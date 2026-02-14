'use client'

import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

export function PlatformExitButton() {
  const [exiting, setExiting] = useState(false)
  const t = useTranslations('dashboard.platform')

  async function handleExit() {
    setExiting(true)
    try {
      await fetch('/api/platform/enter', { method: 'DELETE' })
      window.location.href = '/platform'
    } catch {
      setExiting(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleExit}
      disabled={exiting}
      className="border-white/30 text-white hover:bg-white/20 hover:text-white"
    >
      <LogOut className="mr-1 h-3.5 w-3.5" />
      {exiting ? t('exiting') : t('exitToPlatform')}
    </Button>
  )
}
