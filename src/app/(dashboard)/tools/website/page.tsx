'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Globe, Loader2 } from 'lucide-react'
import { TemplatePicker } from './components/TemplatePicker'
import { WebsiteBuilder } from './components/WebsiteBuilder'

type ViewState = 'loading' | 'pick-template' | 'building'

interface WebsiteData {
  id: string
  businessId: string
  templateId: string
  sections: Record<string, unknown>
  isPublished: boolean
  publishedAt: string | null
  metaTitle: string | null
  metaDescription: string | null
  lastGeneratedAt: string | null
}

interface BusinessData {
  id: string
  slug: string
  name: string
}

export default function MakeWebsitePage() {
  const t = useTranslations('dashboard.tools.website')
  const [view, setView] = useState<ViewState>('loading')
  const [website, setWebsite] = useState<WebsiteData | null>(null)
  const [business, setBusiness] = useState<BusinessData | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWebsite = useCallback(async () => {
    try {
      const [websiteRes, settingsRes] = await Promise.all([
        fetch('/api/admin/website'),
        fetch('/api/admin/settings'),
      ])
      const websiteData = await websiteRes.json()
      const settingsData = await settingsRes.json()

      if (settingsData.business) {
        setBusiness({
          id: settingsData.business.id,
          slug: settingsData.business.slug,
          name: settingsData.business.name,
        })
      }

      if (websiteData.website) {
        setWebsite(websiteData.website)
        setView('building')
      } else {
        setView('pick-template')
      }
    } catch {
      setError(t('errorLoading'))
      setView('pick-template')
    }
  }, [])

  useEffect(() => {
    fetchWebsite()
  }, [fetchWebsite])

  const handleGenerate = async (templateId: string) => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setWebsite(data.website)
      setView('building')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGenerating'))
    } finally {
      setGenerating(false)
    }
  }

  if (view === 'loading') {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Globe className="h-6 w-6" />
          {t('title')}
        </h1>
        <p className="text-gray-600">{t('subtitle')}</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {view === 'pick-template' && (
        <TemplatePicker onSelect={handleGenerate} generating={generating} />
      )}

      {view === 'building' && website && business && (
        <WebsiteBuilder
          website={website}
          business={business}
          onUpdate={setWebsite}
          onSwitchTemplate={() => setView('pick-template')}
        />
      )}
    </div>
  )
}
