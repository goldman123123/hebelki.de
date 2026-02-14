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

const categoryLabels: Record<string, string> = {
  home: 'Startseite',
  about: 'Über uns',
  services: 'Leistungen',
  contact: 'Kontakt',
  blog: 'Blog',
  legal: 'Rechtliches',
  other: 'Andere',
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
          toast.success('Website-Inhalte erfolgreich importiert')
          onScrapeComplete?.()
        } else if (data.status === 'failed') {
          clearInterval(pollInterval)
          setState('error')
          setError(data.error || 'Scraping fehlgeschlagen')
          toast.error('Scraping fehlgeschlagen')
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

  const getStageMessage = (stage: string) => {
    const messages: Record<string, string> = {
      discovering: 'Seiten werden entdeckt...',
      scraping: 'Inhalte werden geladen...',
      chunking: 'Inhalte werden aufbereitet...',
      embedding: 'Embeddings werden erstellt...',
      extracting: 'Wissen wird extrahiert...',
      saving: 'Daten werden gespeichert...',
    }
    return messages[stage] || 'Verarbeitung...'
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
      toast.error('Ungültige URL')
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
        throw new Error(data.error || 'Fehler beim Entdecken der Seiten')
      }

      setPages(data.pages)
      setDiscoverySource(data.source)
      setState('discovered')

      const selectedCount = data.pages.filter((p: CategorizedPage) => p.selected).length
      toast.success(`${data.pages.length} Seiten gefunden, ${selectedCount} vorausgewählt`)
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      toast.error('Fehler beim Entdecken der Seiten')
    }
  }

  const handleScrape = async () => {
    const selectedPages = pages.filter(p => p.selected)

    if (selectedPages.length === 0) {
      toast.error('Bitte wählen Sie mindestens eine Seite aus')
      return
    }

    setState('scraping')
    setProgress({ stage: 'starting', message: 'Job wird gestartet...' })

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
        throw new Error(data.error || 'Fehler beim Starten des Scrapings')
      }

      setJobId(data.jobId)
      toast.success('Scraping gestartet')
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      toast.error('Fehler beim Starten')
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
          <h3 className="font-medium">Von Website importieren</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Importieren Sie Inhalte direkt von einer Website in die Wissensdatenbank
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
              <span className="ml-2">Entdecken</span>
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
                {selectedCount} von {pages.length} Seiten ausgewählt
                {discoverySource && (
                  <span className="ml-2">
                    (via {discoverySource === 'sitemap' ? 'Sitemap' : 'Crawling'})
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Alle
                </Button>
                <Button variant="ghost" size="sm" onClick={selectNone}>
                  Keine
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
                    {categoryLabels[page.category] || page.category}
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
                    Weniger anzeigen
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    {pages.length - 10} weitere anzeigen
                  </>
                )}
              </Button>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>
                Abbrechen
              </Button>
              <Button onClick={handleScrape} disabled={selectedCount === 0}>
                {selectedCount} Seiten importieren
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
                Das kann einige Minuten dauern...
              </div>
            </div>
          </div>
        )}

        {/* Complete State */}
        {state === 'complete' && (
          <div className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium text-green-600">Import abgeschlossen</div>
              <div className="text-sm text-muted-foreground">
                Die Inhalte wurden zur Wissensdatenbank hinzugefügt
              </div>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={reset}>
              Weitere importieren
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
