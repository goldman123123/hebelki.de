'use client'

import { useState, useEffect } from 'react'
import { useWizard } from '../../context/WizardContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, MessageSquare, Copy, Search, CheckCircle2, XCircle, Clock } from 'lucide-react'
import type { CategorizedPage } from '@/lib/scraper/page-categorizer'

interface StepProps {
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

interface ScrapeLogEntry {
  url: string
  status: 'waiting' | 'scraping' | 'completed' | 'failed'
  size?: string
  error?: string
  index: number
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

  // Scraping phase
  const [scraping, setScraping] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractionStage, setExtractionStage] = useState<'knowledge' | 'services' | null>(null)
  const [scrapeLog, setScrapeLog] = useState<ScrapeLogEntry[]>([])
  const [progress, setProgress] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Results
  const [results, setResults] = useState<ScrapeResults | null>(savedState?.scrapeResults || null)
  const [error, setError] = useState('')

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

  // Phase 2: Start scraping with SSE
  const handleStartScraping = async () => {
    if (!state.businessData?.id || selectedUrls.length === 0) return

    setScraping(true)
    setScrapeLog([])
    setProgress(0)
    setError('')

    try {
      const response = await fetch('/api/onboarding/scrape-selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: state.businessData.id,
          urls: selectedUrls,
          businessType: state.businessData.type
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start scraping')
      }

      // Read SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response body')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'started') {
                setTotalPages(data.data.total)
                // Initialize log with waiting status
                setScrapeLog(selectedUrls.map((url, i) => ({
                  url,
                  status: 'waiting',
                  index: i + 1
                })))
              } else if (data.type === 'scraping') {
                setScrapeLog(prev => prev.map(item =>
                  item.url === data.data.url
                    ? { ...item, status: 'scraping' }
                    : item
                ))
              } else if (data.type === 'completed') {
                setScrapeLog(prev => prev.map(item =>
                  item.url === data.data.url
                    ? { ...item, status: 'completed', size: data.data.size }
                    : item
                ))
                setProgress((data.data.index / data.data.total) * 100)
              } else if (data.type === 'failed') {
                setScrapeLog(prev => prev.map(item =>
                  item.url === data.data.url
                    ? { ...item, status: 'failed', error: data.data.error }
                    : item
                ))
              } else if (data.type === 'pages_complete') {
                setScraping(false)
                setExtracting(true)
                setProgress(100)
              } else if (data.type === 'extracting') {
                setExtractionStage(data.data.stage)
              } else if (data.type === 'extraction_progress') {
                // Update extraction progress based on stage
                console.log(`Extraction progress: ${data.data.stage} - ${data.data.count} items`)
              } else if (data.type === 'complete') {
                setExtracting(false)
                setExtractionStage(null)
                setResults(data.data)

                // Get services from onboarding state (they're stored there by the API)
                const servicesForReview = data.data.servicesCount > 0 ? [] : []

                // Save results to wizard context
                setState({
                  scrapedData: data.data,
                  detectedServices: servicesForReview, // Will be populated from DB in service review step
                  chatbotScraperState: {
                    websiteUrl,
                    discoveredPages,
                    selectedUrls,
                    discoverySource,
                    scrapeResults: data.data
                  }
                })
              } else if (data.type === 'error') {
                setError(data.data.message)
                setScraping(false)
                setExtracting(false)
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError)
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scraping failed')
      setScraping(false)
      setExtracting(false)
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
        <h2 className="text-2xl font-semibold mb-4">Chatbot Knowledge Base Setup</h2>
        <p className="text-gray-600">
          Select which pages from your website to scan for your chatbot&apos;s knowledge base.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Phase 1: URL Input & Discovery */}
      {!discoveredPages.length && !scraping && !extracting && !results && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="website">Website URL</Label>
            <Input
              id="website"
              type="text"
              placeholder="example.com or https://example.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              disabled={discovering}
            />
            <p className="text-sm text-gray-500 mt-2">
              We&apos;ll discover all pages on your website and let you choose which ones to scan.
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
                  Discovering Pages...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Discover Pages
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button variant="ghost" onClick={onSkip}>
              Skip for Now
            </Button>
          </div>
        </div>
      )}

      {/* Phase 2: Page Selection */}
      {discoveredPages.length > 0 && !scraping && !extracting && !results && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">
                Discovered {discoveredPages.length} pages
              </h3>
              <p className="text-sm text-gray-500">
                via {discoverySource === 'sitemap' ? 'sitemap.xml' : 'homepage crawling'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button size="sm" variant="outline" onClick={handleDeselectAll}>
                Deselect All
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
              <strong>{selectedUrls.length}</strong> pages selected
              {selectedUrls.length > 0 && (
                <span className="ml-2 text-gray-400">
                  (~{Math.round(selectedUrls.length * 1.5)}s estimated)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDiscoveredPages([])}
              >
                Change URL
              </Button>
              <Button
                onClick={handleStartScraping}
                disabled={selectedUrls.length === 0}
              >
                Start Scraping ({selectedUrls.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 3: Real-Time Scraping Progress */}
      {(scraping || extracting) && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <div className="flex-1">
              {scraping && (
                <>
                  <p className="font-medium">Scraping pages...</p>
                  <p className="text-sm text-gray-500">
                    {Math.round(progress)}% complete
                  </p>
                </>
              )}
              {extracting && !extractionStage && (
                <>
                  <p className="font-medium">Creating knowledge base...</p>
                  <p className="text-sm text-gray-500">Preparing AI extraction...</p>
                </>
              )}
              {extracting && extractionStage === 'knowledge' && (
                <>
                  <p className="font-medium">Extracting Knowledge Base...</p>
                  <p className="text-sm text-gray-500">AI is analyzing content for FAQs, policies, and information</p>
                </>
              )}
              {extracting && extractionStage === 'services' && (
                <>
                  <p className="font-medium">Detecting Services...</p>
                  <p className="text-sm text-gray-500">AI is identifying services, pricing, and offerings</p>
                </>
              )}
            </div>
          </div>

          {/* Progress bar - only show during scraping */}
          {scraping && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Extraction Progress Indicators */}
          {extracting && (
            <div className="space-y-3 border rounded-lg p-4 bg-blue-50">
              {/* Knowledge Base Extraction */}
              <div className="flex items-center gap-3">
                {extractionStage === 'knowledge' ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                ) : extractionStage === 'services' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">Knowledge Base Extraction</p>
                  <p className="text-xs text-gray-600">
                    {extractionStage === 'knowledge' && 'Processing...'}
                    {extractionStage === 'services' && 'Complete'}
                    {!extractionStage && 'Pending'}
                  </p>
                </div>
              </div>

              {/* Service Detection */}
              <div className="flex items-center gap-3">
                {extractionStage === 'services' ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                ) : extractionStage === 'knowledge' ? (
                  <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">Service Detection</p>
                  <p className="text-xs text-gray-600">
                    {extractionStage === 'services' && 'Processing...'}
                    {extractionStage === 'knowledge' && 'Pending'}
                    {!extractionStage && 'Pending'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Scrape log - only show during scraping */}
          {scraping && scrapeLog.length > 0 && (
            <div className="border rounded-lg p-4 max-h-80 overflow-y-auto bg-gray-50 font-mono text-xs space-y-1">
              {scrapeLog.map((item, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  {item.status === 'waiting' && <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  {item.status === 'scraping' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />}
                  {item.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                  {item.status === 'failed' && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  <span className="flex-1 truncate">{item.url}</span>
                  {item.size && <span className="text-gray-500">{item.size}</span>}
                  {item.error && <span className="text-red-500 text-xs">{item.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Phase 4: Success Summary */}
      {results && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 flex items-center gap-2 text-xl">
              <span className="text-2xl">✓</span> Your Chatbot is Ready!
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-green-700">
              <li>• {results.pagesScraped} pages scraped successfully</li>
              <li>• {results.knowledgeCount} knowledge entries created</li>
              <li>• {results.servicesCount} services detected</li>
              {results.pagesFailed > 0 && (
                <li className="text-amber-600">• {results.pagesFailed} pages failed</li>
              )}
            </ul>
          </div>

          {/* Test Chatbot */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-blue-900 mb-4">Test Your Chatbot</h4>
            <div className="space-y-3">
              <div>
                <a
                  href={`/${state.businessData?.slug}/chat`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Test Chatbot Now
                </a>
                <p className="text-sm text-gray-600 mt-2">
                  Open your chatbot in a new tab to test it immediately
                </p>
              </div>

              {/* Public link */}
              <div className="pt-3 border-t border-blue-200">
                <Label className="text-sm font-medium text-gray-700">
                  Share this link with your customers:
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
                We detected <strong>{results.servicesCount} services</strong> from your website.
                You&apos;ll be able to review and approve them in the next step.
              </p>
            </div>
          )}

          {/* Continue button */}
          <div className="flex justify-center pt-4">
            <Button onClick={onNext} size="lg" className="min-w-[200px]">
              {results.servicesCount > 0
                ? 'Continue to Review Services →'
                : 'Continue to Next Step →'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
