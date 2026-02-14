'use client'

/**
 * UrlScrapeZone
 *
 * Allows users to scrape content from a URL and add it to the knowledge base.
 * Flow:
 * 1. Enter URL → Discover pages (sitemap/crawl)
 * 2. Select pages to scrape
 * 3. Submit → creates worker job
 * 4. Poll for progress → refresh on complete
 */

import { useState, useEffect } from 'react'
import { Globe, Search, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { DataPurpose } from './DocumentList'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboard:chatbot:data:UrlScrapeZone')

interface CategorizedPage {
  url: string
  title: string | null
  category: string
  priority: 'high' | 'medium' | 'low'
  selected: boolean
}

interface UrlScrapeZoneProps {
  businessId: string
  purpose: DataPurpose
  onScrapeComplete?: () => void
}

type DiscoverState = 'idle' | 'discovering' | 'discovered' | 'scraping' | 'complete' | 'error'

const CATEGORY_KEYS: Record<string, string> = {
  home: 'catHome',
  about: 'catAbout',
  services: 'catServices',
  contact: 'catContact',
  blog: 'catBlog',
  legal: 'catLegal',
  other: 'catOther',
}

const priorityColors: Record<string, string> = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-600',
}

export function UrlScrapeZone({
  businessId,
  purpose,
  onScrapeComplete,
}: UrlScrapeZoneProps) {
  const t = useTranslations('dashboard.chatbot.data.scrape')
  const [url, setUrl] = useState('')
  const [state, setState] = useState<DiscoverState>('idle')
  const [pages, setPages] = useState<CategorizedPage[]>([])
  const [discoverySource, setDiscoverySource] = useState<'sitemap' | 'homepage' | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ stage: string; message?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAllPages, setShowAllPages] = useState(false)

  // Polling for job status
  useEffect(() => {
    if (!jobId || state !== 'scraping') return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/data/scrape-url/${jobId}?businessId=${businessId}`)
        const data = await response.json()

        if (data.status === 'done') {
          clearInterval(pollInterval)
          setState('complete')
          setProgress(null)
          toast.success(t('importSuccess'))
          onScrapeComplete?.()
        } else if (data.status === 'failed') {
          clearInterval(pollInterval)
          setState('error')
          setError(data.error || t('scrapingFailed'))
          toast.error(t('scrapingFailed'))
        } else {
          setProgress({
            stage: data.stage || 'processing',
            message: getStageMessage(data.stage),
          })
        }
      } catch (err) {
        log.error('Poll error:', err)
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [jobId, state, businessId, onScrapeComplete])

  const STAGE_KEYS: Record<string, string> = {
    discovering: 'stageDiscovering',
    scraping: 'stageScraping',
    chunking: 'stageChunking',
    embedding: 'stageEmbedding',
    extracting: 'stageExtracting',
    saving: 'stageSaving',
  }

  const getStageMessage = (stage: string) => {
    const key = STAGE_KEYS[stage]
    return key ? t(key) : t('stageDefault')
  }

  const handleDiscover = async () => {
    if (!url.trim()) return

    // Validate URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl
    }

    try {
      new URL(normalizedUrl)
    } catch {
      toast.error(t('invalidUrl'))
      return
    }

    setState('discovering')
    setError(null)
    setPages([])

    try {
      const response = await fetch('/api/data/discover-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl, businessId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('discoverError'))
      }

      setPages(data.pages)
      setDiscoverySource(data.source)
      setState('discovered')

      const selectedCount = data.pages.filter((p: CategorizedPage) => p.selected).length
      toast.success(t('pagesFound', { total: data.pages.length, selected: selectedCount }))
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : t('unknownError'))
      toast.error(t('discoverError'))
    }
  }

  const handleScrape = async () => {
    const selectedPages = pages.filter(p => p.selected)

    if (selectedPages.length === 0) {
      toast.error(t('selectAtLeast'))
      return
    }

    setState('scraping')
    setProgress({ stage: 'starting', message: t('jobStarting') })

    try {
      const response = await fetch('/api/data/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          sourceUrl: url,
          selectedUrls: selectedPages.map(p => p.url),
          purpose,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('startError'))
      }

      setJobId(data.jobId)
      toast.success(t('scrapingStarted'))
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : t('unknownError'))
      toast.error(t('startingError'))
    }
  }

  const togglePage = (index: number) => {
    setPages(prev => prev.map((p, i) =>
      i === index ? { ...p, selected: !p.selected } : p
    ))
  }

  const selectAll = () => {
    setPages(prev => prev.map(p => ({ ...p, selected: true })))
  }

  const selectNone = () => {
    setPages(prev => prev.map(p => ({ ...p, selected: false })))
  }

  const reset = () => {
    setUrl('')
    setState('idle')
    setPages([])
    setDiscoverySource(null)
    setJobId(null)
    setProgress(null)
    setError(null)
  }

  const selectedCount = pages.filter(p => p.selected).length
  const visiblePages = showAllPages ? pages : pages.slice(0, 10)

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">{t('title')}</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {t('description')}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* URL Input */}
        {(state === 'idle' || state === 'discovering' || state === 'error') && (
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={state === 'discovering'}
              onKeyDown={(e) => e.key === 'Enter' && handleDiscover()}
            />
            <Button
              onClick={handleDiscover}
              disabled={state === 'discovering' || !url.trim()}
            >
              {state === 'discovering' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2">{t('discover')}</span>
            </Button>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <XCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Page Selection */}
        {state === 'discovered' && pages.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t('pagesSelected', { selected: selectedCount, total: pages.length })}
                {discoverySource && (
                  <span className="ml-2">
                    ({discoverySource === 'sitemap' ? t('viaSitemap') : t('viaCrawling')})
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  {t('selectAll')}
                </Button>
                <Button variant="ghost" size="sm" onClick={selectNone}>
                  {t('selectNone')}
                </Button>
              </div>
            </div>

            <div className="border rounded-md max-h-64 overflow-y-auto">
              {visiblePages.map((page, index) => (
                <div
                  key={page.url}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 hover:bg-muted/50",
                    index !== visiblePages.length - 1 && "border-b"
                  )}
                >
                  <Checkbox
                    checked={page.selected}
                    onCheckedChange={() => togglePage(index)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {page.title || page.url}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {page.url}
                    </div>
                  </div>
                  <Badge variant="secondary" className={priorityColors[page.priority]}>
                    {CATEGORY_KEYS[page.category] ? t(CATEGORY_KEYS[page.category]) : page.category}
                  </Badge>
                </div>
              ))}
            </div>

            {pages.length > 10 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setShowAllPages(!showAllPages)}
              >
                {showAllPages ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    {t('showLess')}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    {t('showMore', { count: pages.length - 10 })}
                  </>
                )}
              </Button>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>
                {t('cancel')}
              </Button>
              <Button onClick={handleScrape} disabled={selectedCount === 0}>
                {t('importPages', { count: selectedCount })}
              </Button>
            </div>
          </div>
        )}

        {/* Scraping Progress */}
        {state === 'scraping' && progress && (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <div className="font-medium">{progress.message}</div>
              <div className="text-sm text-muted-foreground">
                {t('mayTakeMinutes')}
              </div>
            </div>
          </div>
        )}

        {/* Complete State */}
        {state === 'complete' && (
          <div className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium text-green-600">{t('importComplete')}</div>
              <div className="text-sm text-muted-foreground">
                {t('importCompleteDesc')}
              </div>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={reset}>
              {t('importMore')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
