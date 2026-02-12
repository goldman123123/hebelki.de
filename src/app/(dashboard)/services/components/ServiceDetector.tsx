'use client'

/**
 * ServiceDetector
 *
 * Enhanced service detection component with:
 * 1. Domain Scanner - Discover pages, select, and detect services
 * 2. From Existing Data - Select documents from data tab and detect services
 * 3. Service Review Table - Edit, approve, and add detected services (from wizard)
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Globe,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  Clock,
  Euro,
  Database,
  FileText,
  Trash2,
  Edit,
  Check,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ============================================
// Types
// ============================================

interface DetectedService {
  name: string
  description: string | null
  durationMinutes: number | null
  price: number | null
  category: string | null
  confidence: number
  approved: boolean
}

interface CategorizedPage {
  url: string
  title: string | null
  category: string
  priority: 'high' | 'medium' | 'low'
  selected: boolean
}

interface Document {
  id: string
  title: string
  originalFilename: string
  dataClass: string
  audience: string
  scopeType: string
  createdAt: string
  latestVersion?: {
    fileSize: number
  }
  processingStatus?: {
    status: string
  }
}

interface ServiceDetectorProps {
  businessId: string | null  // Can be null while loading
  businessError?: string | null  // Error message if business fetch failed
  onServicesAdded: () => void
}

type DetectorState = 'idle' | 'discovering' | 'discovered' | 'detecting' | 'review' | 'adding' | 'complete' | 'error'

// ============================================
// Constants
// ============================================

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

// ============================================
// Component
// ============================================

export function ServiceDetector({ businessId, businessError, onServicesAdded }: ServiceDetectorProps) {
  // ALL HOOKS MUST BE AT THE TOP - before any conditional returns
  // Tab state
  const [activeTab, setActiveTab] = useState<'domain' | 'data'>('domain')
  const [isExpanded, setIsExpanded] = useState(true)

  // Domain scanner state
  const [url, setUrl] = useState('')
  const [state, setState] = useState<DetectorState>('idle')
  const [pages, setPages] = useState<CategorizedPage[]>([])
  const [discoverySource, setDiscoverySource] = useState<'sitemap' | 'homepage' | null>(null)
  const [showAllPages, setShowAllPages] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Document selection state
  const [documents, setDocuments] = useState<Document[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])

  // Detection results state
  const [services, setServices] = useState<DetectedService[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [pagesScraped, setPagesScraped] = useState(0)

  // ============================================
  // Load documents for "From Existing Data" tab
  // ============================================
  useEffect(() => {
    if (businessId && activeTab === 'data' && documents.length === 0) {
      loadDocuments()
    }
  }, [activeTab, businessId])

  const loadDocuments = async () => {
    if (!businessId) return
    setLoadingDocs(true)
    try {
      const response = await fetch(`/api/documents?businessId=${businessId}&dataClass=knowledge`)
      const data = await response.json()
      if (response.ok) {
        // Filter to only show completed documents
        const completedDocs = (data.documents || []).filter(
          (doc: Document) => doc.processingStatus?.status === 'done'
        )
        setDocuments(completedDocs)
      }
    } catch (err) {
      console.error('Failed to load documents:', err)
    } finally {
      setLoadingDocs(false)
    }
  }

  // Show error state if business fetch failed
  if (businessError) {
    return (
      <Card className="border-dashed mb-6 border-amber-200 bg-amber-50/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <div>
              <CardTitle className="text-base">Automatische Service-Erkennung</CardTitle>
              <CardDescription className="text-amber-700">
                {businessError}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  // Show loading state if no businessId yet
  if (!businessId) {
    return (
      <Card className="border-dashed mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <div>
              <CardTitle className="text-base">Automatische Service-Erkennung</CardTitle>
              <CardDescription>
                Wird geladen...
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // ============================================
  // Domain Discovery
  // ============================================
  const handleDiscover = async () => {
    if (!url.trim()) return

    // Normalize URL
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

  // ============================================
  // Service Detection from URL
  // ============================================
  const handleDetectFromPages = async () => {
    const selectedPages = pages.filter(p => p.selected)
    if (selectedPages.length === 0) {
      toast.error('Bitte wählen Sie mindestens eine Seite aus')
      return
    }

    setState('detecting')
    setError(null)

    try {
      const response = await fetch('/api/admin/services/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          url: url.trim().startsWith('http') ? url.trim() : 'https://' + url.trim(),
          selectedUrls: selectedPages.map(p => p.url),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Service-Erkennung fehlgeschlagen')
      }

      // Convert to reviewable format with approved=true by default
      const reviewableServices: DetectedService[] = (data.services || []).map((s: Omit<DetectedService, 'approved'>) => ({
        ...s,
        approved: true,
      }))

      setServices(reviewableServices)
      setPagesScraped(data.pagesScraped || selectedPages.length)
      setState('review')

      if (reviewableServices.length === 0) {
        toast.warning('Keine Services auf den ausgewählten Seiten gefunden')
      } else {
        toast.success(`${reviewableServices.length} Services erkannt`)
      }
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Erkennung fehlgeschlagen')
      toast.error('Service-Erkennung fehlgeschlagen')
    }
  }

  // ============================================
  // Service Detection from Documents
  // ============================================
  const handleDetectFromDocuments = async () => {
    if (selectedDocIds.length === 0) {
      toast.error('Bitte wählen Sie mindestens ein Dokument aus')
      return
    }

    setState('detecting')
    setError(null)

    try {
      const response = await fetch('/api/admin/services/detect-from-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          documentIds: selectedDocIds,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Service-Erkennung fehlgeschlagen')
      }

      // Convert to reviewable format
      const reviewableServices: DetectedService[] = (data.services || []).map((s: Omit<DetectedService, 'approved'>) => ({
        ...s,
        approved: true,
      }))

      setServices(reviewableServices)
      setPagesScraped(selectedDocIds.length)
      setState('review')

      if (reviewableServices.length === 0) {
        toast.warning('Keine Services in den Dokumenten gefunden')
      } else {
        toast.success(`${reviewableServices.length} Services erkannt`)
      }
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Erkennung fehlgeschlagen')
      toast.error('Service-Erkennung fehlgeschlagen')
    }
  }

  // ============================================
  // Service Review Handlers
  // ============================================
  const handleToggleApprove = (index: number) => {
    setServices(prev => prev.map((s, i) =>
      i === index ? { ...s, approved: !s.approved } : s
    ))
  }

  const handleEdit = (index: number, field: string, value: string | number | boolean | null) => {
    setServices(prev => prev.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    ))
  }

  const handleDelete = (index: number) => {
    setServices(prev => prev.filter((_, i) => i !== index))
  }

  const handleToggleAllApproved = (approved: boolean) => {
    setServices(prev => prev.map(s => ({ ...s, approved })))
  }

  // ============================================
  // Add Services
  // ============================================
  const handleAddServices = async () => {
    const approvedServices = services.filter(s => s.approved)
    if (approvedServices.length === 0) {
      toast.error('Bitte wählen Sie mindestens einen Service aus')
      return
    }

    setState('adding')

    try {
      // Add each service
      for (const service of approvedServices) {
        await fetch('/api/admin/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: service.name,
            description: service.description,
            category: service.category,
            durationMinutes: service.durationMinutes || 60,
            price: service.price ? String(service.price) : null,
            isActive: true,
          }),
        })
      }

      toast.success(`${approvedServices.length} Services hinzugefügt`)
      setState('complete')
      onServicesAdded()

      // Reset after short delay
      setTimeout(() => {
        reset()
      }, 2000)
    } catch (err) {
      setState('error')
      setError('Fehler beim Hinzufügen der Services')
      toast.error('Fehler beim Hinzufügen')
    }
  }

  // ============================================
  // Page/Document Selection Helpers
  // ============================================
  const togglePage = (index: number) => {
    setPages(prev => prev.map((p, i) =>
      i === index ? { ...p, selected: !p.selected } : p
    ))
  }

  const selectAllPages = () => setPages(prev => prev.map(p => ({ ...p, selected: true })))
  const selectNoPages = () => setPages(prev => prev.map(p => ({ ...p, selected: false })))

  const toggleDocument = (docId: string) => {
    setSelectedDocIds(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    )
  }

  const selectAllDocs = () => setSelectedDocIds(documents.map(d => d.id))
  const selectNoDocs = () => setSelectedDocIds([])

  // ============================================
  // Reset
  // ============================================
  const reset = () => {
    setUrl('')
    setState('idle')
    setPages([])
    setDiscoverySource(null)
    setShowAllPages(false)
    setError(null)
    setServices([])
    setEditingIndex(null)
    setSelectedDocIds([])
    setPagesScraped(0)
  }

  // ============================================
  // Computed Values
  // ============================================
  const selectedPageCount = pages.filter(p => p.selected).length
  const visiblePages = showAllPages ? pages : pages.slice(0, 10)
  const approvedCount = services.filter(s => s.approved).length
  const skippedCount = services.length - approvedCount

  // ============================================
  // Render
  // ============================================
  return (
    <Card className="border-dashed mb-6">
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <div>
              <CardTitle className="text-base">Automatische Service-Erkennung</CardTitle>
              <CardDescription>
                Lassen Sie AI Services von Ihrer Website oder bestehenden Daten erkennen
              </CardDescription>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Show tabs only when not in review/adding state */}
          {state !== 'review' && state !== 'adding' && state !== 'complete' && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'domain' | 'data')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="domain" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Domain scannen
                </TabsTrigger>
                <TabsTrigger value="data" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Bestehende Daten
                </TabsTrigger>
              </TabsList>

              {/* ============================================ */}
              {/* Domain Scanner Tab */}
              {/* ============================================ */}
              <TabsContent value="domain" className="space-y-4 mt-4">
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
                        {selectedPageCount} von {pages.length} Seiten ausgewählt
                        {discoverySource && (
                          <span className="ml-2">
                            (via {discoverySource === 'sitemap' ? 'Sitemap' : 'Crawling'})
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={selectAllPages}>Alle</Button>
                        <Button variant="ghost" size="sm" onClick={selectNoPages}>Keine</Button>
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
                      <Button variant="outline" onClick={reset}>Abbrechen</Button>
                      <Button onClick={handleDetectFromPages} disabled={selectedPageCount === 0}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Services erkennen
                      </Button>
                    </div>
                  </div>
                )}

                {/* Detecting Progress */}
                {state === 'detecting' && (
                  <div className="flex items-center gap-3 py-8 justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    <div className="text-center">
                      <div className="font-medium">Services werden erkannt...</div>
                      <div className="text-sm text-muted-foreground">
                        Dies kann 30-60 Sekunden dauern
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ============================================ */}
              {/* Existing Data Tab */}
              {/* ============================================ */}
              <TabsContent value="data" className="space-y-4 mt-4">
                {loadingDocs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Keine Dokumente in der Wissensdatenbank</p>
                    <p className="text-sm">Importieren Sie zuerst Daten im Daten-Tab</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {selectedDocIds.length} von {documents.length} Dokumenten ausgewählt
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={selectAllDocs}>Alle</Button>
                        <Button variant="ghost" size="sm" onClick={selectNoDocs}>Keine</Button>
                      </div>
                    </div>

                    <div className="border rounded-md max-h-64 overflow-y-auto">
                      {documents.map((doc, index) => (
                        <div
                          key={doc.id}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 hover:bg-muted/50",
                            index !== documents.length - 1 && "border-b"
                          )}
                        >
                          <Checkbox
                            checked={selectedDocIds.includes(doc.id)}
                            onCheckedChange={() => toggleDocument(doc.id)}
                          />
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{doc.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {doc.originalFilename}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {doc.audience === 'public' ? 'Öffentlich' : 'Intern'}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleDetectFromDocuments}
                        disabled={selectedDocIds.length === 0 || state === 'detecting'}
                      >
                        {state === 'detecting' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Services erkennen
                      </Button>
                    </div>
                  </div>
                )}

                {/* Detecting Progress */}
                {state === 'detecting' && (
                  <div className="flex items-center gap-3 py-8 justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    <div className="text-center">
                      <div className="font-medium">Services werden erkannt...</div>
                      <div className="text-sm text-muted-foreground">
                        Analysiere {selectedDocIds.length} Dokument{selectedDocIds.length !== 1 ? 'e' : ''}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* ============================================ */}
          {/* Service Review Table (from wizard Step4) */}
          {/* ============================================ */}
          {state === 'review' && services.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Erkannte Services überprüfen</h3>
                  <p className="text-sm text-muted-foreground">
                    {services.length} Services von {pagesScraped} Quellen erkannt. Bearbeiten und bestätigen Sie die Services.
                  </p>
                </div>
              </div>

              {/* Service Review Table */}
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-3 text-left w-12">
                        <Checkbox
                          checked={services.every(s => s.approved)}
                          onCheckedChange={(checked) => handleToggleAllApproved(!!checked)}
                        />
                      </th>
                      <th className="px-3 py-3 text-left font-medium text-sm">Service Name</th>
                      <th className="px-3 py-3 text-left font-medium text-sm w-28">Dauer</th>
                      <th className="px-3 py-3 text-left font-medium text-sm w-28">Preis</th>
                      <th className="px-3 py-3 text-left font-medium text-sm w-32">Kategorie</th>
                      <th className="px-3 py-3 text-left font-medium text-sm w-24">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service, index) => (
                      <tr
                        key={index}
                        className={cn(
                          "border-b last:border-b-0",
                          !service.approved ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'
                        )}
                      >
                        <td className="px-3 py-3">
                          <Checkbox
                            checked={service.approved}
                            onCheckedChange={() => handleToggleApprove(index)}
                          />
                        </td>
                        <td className="px-3 py-3">
                          {editingIndex === index ? (
                            <div className="space-y-2">
                              <Input
                                value={service.name}
                                onChange={(e) => handleEdit(index, 'name', e.target.value)}
                                placeholder="Service Name"
                                className="font-medium"
                              />
                              <Input
                                value={service.description || ''}
                                onChange={(e) => handleEdit(index, 'description', e.target.value)}
                                placeholder="Beschreibung"
                                className="text-sm"
                              />
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium">{service.name}</div>
                              {service.description && (
                                <div className="text-sm text-gray-500 line-clamp-2">
                                  {service.description}
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                Konfidenz: {service.confidence}%
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {editingIndex === index ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={service.durationMinutes || ''}
                                onChange={(e) => handleEdit(index, 'durationMinutes', e.target.value ? Number(e.target.value) : null)}
                                placeholder="60"
                                className="w-20"
                              />
                              <span className="text-sm text-gray-500">min</span>
                            </div>
                          ) : (
                            service.durationMinutes ? (
                              <span className="text-sm flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {service.durationMinutes} min
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {editingIndex === index ? (
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-gray-500">€</span>
                              <Input
                                type="number"
                                step="0.01"
                                value={service.price || ''}
                                onChange={(e) => handleEdit(index, 'price', e.target.value ? Number(e.target.value) : null)}
                                placeholder="50"
                                className="w-20"
                              />
                            </div>
                          ) : (
                            service.price ? (
                              <span className="text-sm flex items-center gap-1">
                                <Euro className="h-3 w-3" />
                                {service.price}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {editingIndex === index ? (
                            <Input
                              value={service.category || ''}
                              onChange={(e) => handleEdit(index, 'category', e.target.value)}
                              placeholder="Allgemein"
                              className="w-full"
                            />
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              {service.category || 'Allgemein'}
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-0.5">
                            {editingIndex === index ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingIndex(null)}
                                className="h-7 w-7 p-0"
                                title="Speichern"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingIndex(index)}
                                className="h-7 w-7 p-0"
                                title="Bearbeiten"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(index)}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Löschen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm">
                  <strong>{approvedCount} Service{approvedCount !== 1 ? 's' : ''}</strong> werden hinzugefügt.
                  {skippedCount > 0 && (
                    <span className="text-gray-600"> ({skippedCount} übersprungen)</span>
                  )}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>
                  Abbrechen
                </Button>
                <Button
                  onClick={handleAddServices}
                  disabled={approvedCount === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {approvedCount} Service{approvedCount !== 1 ? 's' : ''} hinzufügen
                </Button>
              </div>
            </div>
          )}

          {/* No Services Found */}
          {state === 'review' && services.length === 0 && (
            <div className="flex items-center gap-3 py-8 justify-center">
              <CheckCircle2 className="h-6 w-6 text-amber-500" />
              <div className="text-center">
                <div className="font-medium">Keine Services gefunden</div>
                <div className="text-sm text-muted-foreground">
                  Versuchen Sie es mit anderen Seiten oder fügen Sie Services manuell hinzu.
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>
                Erneut versuchen
              </Button>
            </div>
          )}

          {/* Adding Progress */}
          {state === 'adding' && (
            <div className="flex items-center gap-3 py-8 justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <div className="text-center">
                <div className="font-medium">Services werden hinzugefügt...</div>
              </div>
            </div>
          )}

          {/* Complete State */}
          {state === 'complete' && (
            <div className="flex items-center gap-3 py-8 justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div className="text-center">
                <div className="font-medium text-green-600">Services erfolgreich hinzugefügt!</div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
