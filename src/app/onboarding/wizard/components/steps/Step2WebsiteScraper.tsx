'use client'

import { useState, useEffect, useRef } from 'react'
import { useWizard } from '../../context/WizardContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, MessageSquare, Copy, Search, CheckCircle2, XCircle, Clock } from 'lucide-react'
import type { CategorizedPage } from '@/lib/scraper/page-categorizer'
import { createLogger } from '@/lib/logger'

const log = createLogger('app:onboarding:wizard:components:steps:Step2WebsiteScraper')

interface StepProps {
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

interface ScrapeResults {
  knowledgeCount: number
  servicesCount: number
  pagesScraped: number
  pagesFailed: number
}

// Helper function to normalize URLs
const normalizeUrl = (url: string): string => {
  url = url.trim()
  if (!url.match(/^https?:\/\//i)) {
    url = 'https://' + url
  }
  return url
}

// Stage messages for progress display
const stageMessages: Record<string, string> = {
  discovering: 'Seiten werden entdeckt...',
  scraping: 'Inhalte werden geladen...',
  chunking: 'Inhalte werden aufbereitet...',
  embedding: 'Embeddings werden erstellt...',
  extracting: 'Wissen wird extrahiert...',
  saving: 'Daten werden gespeichert...',
  processing: 'Verarbeitung läuft...',
  detecting_services: 'Dienstleistungen werden erkannt...',
}

export function Step2WebsiteScraper({ onNext, onBack, onSkip }: StepProps) {
  const { state, setState } = useWizard()

  // Initialize from wizard context state (for navigation persistence)
  const savedState = state.chatbotScraperState

  const [websiteUrl, setWebsiteUrl] = useState(savedState?.websiteUrl || '')

  // Discovery phase
  const [discovering, setDiscovering] = useState(false)
  const [discoveredPages, setDiscoveredPages] = useState<CategorizedPage[]>(savedState?.discoveredPages || [])
  const [selectedUrls, setSelectedUrls] = useState<string[]>(savedState?.selectedUrls || [])
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [discoverySource, setDiscoverySource] = useState<'sitemap' | 'homepage'>(savedState?.discoverySource || 'sitemap')

  // Scraping phase (worker-based)
  const [scraping, setScraping] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [currentStage, setCurrentStage] = useState<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Results
  const [results, setResults] = useState<ScrapeResults | null>(savedState?.scrapeResults || null)
  const [error, setError] = useState('')

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  // Poll for job status when we have a jobId
  useEffect(() => {
    if (!jobId || !scraping) return

    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/data/scrape-url/${jobId}?businessId=${state.businessData?.id}`
        )
        const data = await response.json()

        if (data.status === 'done') {
          // Job completed - stop polling
          clearInterval(pollingRef.current!)
          pollingRef.current = null

          // Extract results from metrics
          const metrics = data.metrics || {}
          const scrapeResults: ScrapeResults = {
            knowledgeCount: metrics.knowledgeEntriesCreated || 0,
            servicesCount: metrics.detectedServices || 0,
            pagesScraped: metrics.pagesScraped || selectedUrls.length,
            pagesFailed: metrics.scrapeErrors || 0,
          }

          // NEW: Extract services from scraped knowledge if none detected
          // The worker sets extractServices: true but may not return services
          if (scrapeResults.servicesCount === 0 && state.businessData?.id) {
            setCurrentStage('detecting_services')

            try {
              const detectResponse = await fetch('/api/onboarding/detect-services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId: state.businessData.id }),
              })

              if (detectResponse.ok) {
                const { services } = await detectResponse.json()

                if (services?.length > 0) {
                  log.info(`Detected ${services.length} services from knowledge`)
                  scrapeResults.servicesCount = services.length

                  // Save to database for Step4 to read
                  try {
                    const bizResponse = await fetch(`/api/businesses/${state.businessData.id}`)
                    const business = await bizResponse.json()
                    const currentState = business.onboardingState || {}

                    await fetch(`/api/businesses/${state.businessData.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        onboardingState: {
                          ...currentState,
                          servicesForReview: services
                        }
                      })
                    })
                    log.info('Saved servicesForReview to database')
                  } catch (err) {
                    log.error('Failed to save services to database:', err)
                  }

                  // Save detected services to wizard context for Step4
                  setScraping(false)
                  setResults(scrapeResults)
                  setState({
                    scrapedData: {
                      status: 'done',
                      progress: 100,
                      pagesScraped: scrapeResults.pagesScraped,
                      knowledgeEntriesCreated: scrapeResults.knowledgeCount,
                      servicesDetected: services,
                    },
                    detectedServices: services,
                    chatbotScraperState: {
                      websiteUrl,
                      discoveredPages,
                      selectedUrls,
                      discoverySource,
                      scrapeResults,
                    },
                  })
                  return // Early exit - state is set
                } else {
                  log.info('No services detected from knowledge')
                }
              } else {
                const errorData = await detectResponse.json().catch(() => ({}))
                log.error('Detect services API failed:', detectResponse.status, errorData)
              }
            } catch (err) {
              log.error('Service detection failed:', err)
              // Continue with 0 services - not a fatal error
            }
          }

          // Save to database for Step4 to read (if we have services from worker metrics)
          const detectedServicesData = metrics.detectedServicesData || []
          if (detectedServicesData.length > 0 && state.businessData?.id) {
            try {
              const bizResponse = await fetch(`/api/businesses/${state.businessData.id}`)
              const business = await bizResponse.json()
              const currentState = business.onboardingState || {}

              await fetch(`/api/businesses/${state.businessData.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  onboardingState: {
                    ...currentState,
                    servicesForReview: detectedServicesData
                  }
                })
              })
              log.info('Saved servicesForReview from worker metrics to database')
            } catch (err) {
              log.error('Failed to save services to database:', err)
            }
          }

          setScraping(false)
          setResults(scrapeResults)

          // Save to wizard context (using the expected scrapedData format)
          setState({
            scrapedData: {
              status: 'done',
              progress: 100,
              pagesScraped: scrapeResults.pagesScraped,
              knowledgeEntriesCreated: scrapeResults.knowledgeCount,
              servicesDetected: detectedServicesData,
            },
            detectedServices: detectedServicesData,
            chatbotScraperState: {
              websiteUrl,
              discoveredPages,
              selectedUrls,
              discoverySource,
              scrapeResults,
            },
          })
        } else if (data.status === 'failed') {
          // Job failed
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          setScraping(false)
          setError(data.error || 'Scraping fehlgeschlagen')
        } else {
          // Still processing - update stage
          setCurrentStage(data.stage || 'processing')
        }
      } catch (err) {
        log.error('Polling error:', err)
      }
    }, 2000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [jobId, scraping, state.businessData?.id, websiteUrl, discoveredPages, selectedUrls, discoverySource, setState])

  // Phase 1: Discover pages
  const handleDiscoverPages = async () => {
    if (!websiteUrl) return

    setDiscovering(true)
    setError('')

    try {
      const normalizedUrl = normalizeUrl(websiteUrl)

      const response = await fetch('/api/onboarding/discover-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: normalizedUrl })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Discovery failed')
      }

      if (data.success) {
        setDiscoveredPages(data.pages)
        setDiscoverySource(data.source)

        // Select ALL pages by default
        const allUrls = data.pages.map((p: CategorizedPage) => p.url)
        setSelectedUrls(allUrls)

        // Save to wizard context for navigation persistence
        setState({
          chatbotScraperState: {
            websiteUrl: normalizedUrl,
            discoveredPages: data.pages,
            selectedUrls: allUrls,
            discoverySource: data.source
          }
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discover pages')
    } finally {
      setDiscovering(false)
    }
  }

  // Phase 2: Start scraping using worker
  const handleStartScraping = async () => {
    if (!state.businessData?.id || selectedUrls.length === 0) return

    setScraping(true)
    setCurrentStage('starting')
    setError('')

    try {
      // Create worker job
      const response = await fetch('/api/onboarding/scrape-selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: state.businessData.id,
          urls: selectedUrls,
          businessType: state.businessData.type
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start scraping')
      }

      // Start polling for progress
      setJobId(data.jobId)
      setCurrentStage('discovering')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scraping failed')
      setScraping(false)
    }
  }

  // Bulk selection helpers
  const handleSelectAll = () => {
    const filtered = getFilteredPages()
    setSelectedUrls(prev => [...new Set([...prev, ...filtered.map(p => p.url)])])
  }

  const handleDeselectAll = () => {
    const filtered = getFilteredPages()
    const filteredUrls = new Set(filtered.map(p => p.url))
    setSelectedUrls(prev => prev.filter(url => !filteredUrls.has(url)))
  }

  const getFilteredPages = () => {
    if (filterCategory === 'all') return discoveredPages
    return discoveredPages.filter(p => p.category === filterCategory)
  }

  const filteredPages = getFilteredPages()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Chatbot-Wissensdatenbank einrichten</h2>
        <p className="text-gray-600">
          Wählen Sie, welche Seiten Ihrer Website für die Wissensdatenbank Ihres Chatbots gescannt werden sollen.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Phase 1: URL Input & Discovery */}
      {!discoveredPages.length && !scraping && !results && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="website">Website-URL</Label>
            <Input
              id="website"
              type="text"
              placeholder="beispiel.de oder https://beispiel.de"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              disabled={discovering}
            />
            <p className="text-sm text-gray-500 mt-2">
              Wir entdecken alle Seiten auf Ihrer Website und lassen Sie wählen, welche gescannt werden sollen.
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleDiscoverPages}
              disabled={discovering || !websiteUrl}
            >
              {discovering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Seiten werden entdeckt...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Seiten entdecken
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onBack}>
              Zurück
            </Button>
            <Button variant="ghost" onClick={onSkip}>
              Jetzt überspringen
            </Button>
          </div>
        </div>
      )}

      {/* Phase 2: Page Selection */}
      {discoveredPages.length > 0 && !scraping && !results && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">
                {discoveredPages.length} Seiten entdeckt
              </h3>
              <p className="text-sm text-gray-500">
                via {discoverySource === 'sitemap' ? 'sitemap.xml' : 'Homepage-Crawling'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleSelectAll}>
                Alle auswählen
              </Button>
              <Button size="sm" variant="outline" onClick={handleDeselectAll}>
                Alle abwählen
              </Button>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'home', 'about', 'services', 'contact', 'blog', 'legal', 'other'].map(cat => (
              <Button
                key={cat}
                size="sm"
                variant={filterCategory === cat ? 'default' : 'outline'}
                onClick={() => setFilterCategory(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Button>
            ))}
          </div>

          {/* Page list */}
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            {filteredPages.map(page => (
              <div key={page.url} className="flex items-start gap-3 p-3 border-b hover:bg-gray-50">
                <Checkbox
                  checked={selectedUrls.includes(page.url)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedUrls(prev => [...prev, page.url])
                    } else {
                      setSelectedUrls(prev => prev.filter(u => u !== page.url))
                    }
                  }}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {page.title || new URL(page.url).pathname || '/'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{page.url}</div>
                </div>
                <div className="flex gap-1">
                  <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                    page.priority === 'high' ? 'bg-green-100 text-green-800' :
                    page.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {page.category}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer with count and action */}
          <div className="flex justify-between items-center pt-2">
            <div className="text-sm text-gray-600">
              <strong>{selectedUrls.length}</strong> Seiten ausgewählt
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDiscoveredPages([])}
              >
                URL ändern
              </Button>
              <Button
                onClick={handleStartScraping}
                disabled={selectedUrls.length === 0}
              >
                Scannen starten ({selectedUrls.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 3: Worker-Based Progress */}
      {scraping && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <div className="flex-1">
              <p className="font-medium">
                {stageMessages[currentStage || 'processing'] || 'Verarbeitung läuft...'}
              </p>
              <p className="text-sm text-gray-500">
                Das kann einige Minuten dauern...
              </p>
            </div>
          </div>

          {/* Stage indicators */}
          <div className="space-y-3 border rounded-lg p-4 bg-blue-50">
            {['scraping', 'chunking', 'embedding', 'extracting', 'detecting_services'].map((stage, i) => {
              const stages = ['scraping', 'chunking', 'embedding', 'extracting', 'detecting_services']
              const currentIndex = stages.indexOf(currentStage || '')
              const stageIndex = stages.indexOf(stage)

              let status: 'pending' | 'active' | 'done' = 'pending'
              if (stageIndex < currentIndex) status = 'done'
              else if (stageIndex === currentIndex) status = 'active'

              return (
                <div key={stage} className="flex items-center gap-3">
                  {status === 'done' && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />}
                  {status === 'active' && <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />}
                  {status === 'pending' && <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {stageMessages[stage]}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Phase 4: Success Summary */}
      {results && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 flex items-center gap-2 text-xl">
              <span className="text-2xl">&#10003;</span> Ihr Chatbot ist bereit!
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-green-700">
              <li>&bull; {results.pagesScraped} Seiten erfolgreich gescannt</li>
              <li>&bull; {results.knowledgeCount} Wissenseinträge erstellt</li>
              <li>&bull; {results.servicesCount} Dienstleistungen erkannt</li>
              {results.pagesFailed > 0 && (
                <li className="text-amber-600">&bull; {results.pagesFailed} Seiten fehlgeschlagen</li>
              )}
            </ul>
          </div>

          {/* Test Chatbot */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-blue-900 mb-4">Testen Sie Ihren Chatbot</h4>
            <div className="space-y-3">
              <div>
                <a
                  href={`/${state.businessData?.slug}/chat`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Chatbot jetzt testen
                </a>
                <p className="text-sm text-gray-600 mt-2">
                  Öffnen Sie Ihren Chatbot in einem neuen Tab, um ihn sofort zu testen
                </p>
              </div>

              {/* Public link */}
              <div className="pt-3 border-t border-blue-200">
                <Label className="text-sm font-medium text-gray-700">
                  Teilen Sie diesen Link mit Ihren Kunden:
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    readOnly
                    value={`https://hebelki.de/${state.businessData?.slug}/chat`}
                    className="flex-1 bg-white"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://hebelki.de/${state.businessData?.slug}/chat`)
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Services detected */}
          {results.servicesCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900">
                Wir haben <strong>{results.servicesCount} Dienstleistungen</strong> auf Ihrer Website erkannt.
                Sie können diese im nächsten Schritt prüfen und genehmigen.
              </p>
            </div>
          )}

          {/* Continue button */}
          <div className="flex justify-center pt-4">
            <Button onClick={onNext} size="lg" className="min-w-[200px]">
              {results.servicesCount > 0
                ? 'Weiter zur Dienstleistungsprüfung →'
                : 'Weiter zum nächsten Schritt →'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
