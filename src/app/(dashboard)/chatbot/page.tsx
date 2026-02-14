'use client'

/**
 * Chatbot Dashboard
 *
 * Unified management of chatbot knowledge base, conversations, settings, and documents.
 *
 * 7 tabs:
 * - Wissensdatenbank: Manual knowledge entries
 * - Gespräche: Conversation history
 * - Einstellungen: Chatbot settings
 * - Dokumente: Public chatbot documents (PDFs, scraped websites)
 * - Intern: Internal staff documents
 * - Kunden: Customer-specific documents
 * - Archiv: Stored-only business data (CSV, Excel)
 */

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Book, MessageSquare, Settings, Loader2, FileText, Building2, User, Database, Code } from 'lucide-react'
import { KnowledgeBaseTab } from './components/KnowledgeBaseTab'
import { ConversationsTab } from './components/ConversationsTab'
import { SettingsTab } from './components/SettingsTab'
import { EmbedCodeTab } from './components/EmbedCodeTab'

import { DataSection } from './components/data/DataSection'
import { AiLiteracyBanner } from '@/components/dashboard/AiLiteracyBanner'
import Link from 'next/link'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboard:chatbot')

interface Business {
  id: string
  name: string
  slug: string
  type: string | null
  primaryColor: string
  chatbotColor?: string
  settings?: Record<string, unknown>
}

interface TabCounts {
  dokumente: number
  intern: number
  kunden: number
  archiv: number
}

const chatbotTabs = [
  { value: 'knowledge', label: 'Wissensdatenbank', shortLabel: 'Wissen', icon: Book, group: 'main' },
  { value: 'conversations', label: 'Gespräche', shortLabel: 'Chats', icon: MessageSquare, group: 'main' },
  { value: 'settings', label: 'Einstellungen', shortLabel: 'Einstell.', icon: Settings, group: 'main' },
  { value: 'dokumente', label: 'Dokumente', shortLabel: 'Doku.', icon: FileText, group: 'data' },
  { value: 'intern', label: 'Intern', shortLabel: 'Intern', icon: Building2, group: 'data' },
  { value: 'kunden', label: 'Kunden', shortLabel: 'Kunden', icon: User, group: 'data' },
  { value: 'archiv', label: 'Archiv', shortLabel: 'Archiv', icon: Database, group: 'data' },
  { value: 'integration', label: 'Integration', shortLabel: 'Embed', icon: Code, group: 'data' },
] as const

const countBadgeColors: Record<string, string> = {
  dokumente: 'bg-green-100 text-green-700',
  intern: 'bg-blue-100 text-blue-700',
  kunden: 'bg-purple-100 text-purple-700',
  archiv: 'bg-amber-100 text-amber-700',
}

export default function ChatbotDashboardPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<TabCounts>({ dokumente: 0, intern: 0, kunden: 0, archiv: 0 })
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState('knowledge')

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const response = await fetch('/api/businesses/my')
        const data = await response.json()

        if (data.success && data.businesses.length > 0) {
          const firstBusiness = data.businesses[0]
          const biz = firstBusiness.business
          const bizSettings = typeof biz.settings === 'object' && biz.settings !== null ? biz.settings : {}
          setBusiness({
            id: biz.id,
            name: biz.name,
            slug: biz.slug,
            type: biz.type,
            primaryColor: biz.primaryColor || '#3B82F6',
            chatbotColor: (bizSettings as Record<string, string>).chatbotColor,
            settings: bizSettings as Record<string, unknown>,
          })
        }
      } catch (error) {
        log.error('Failed to fetch business:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBusiness()
  }, [])

  // Fetch document counts for all 4 document tabs
  const fetchCounts = useCallback(async () => {
    if (!business?.id) return

    try {
      const [dokumenteRes, internRes, kundenRes, archivRes] = await Promise.all([
        fetch(`/api/documents?businessId=${business.id}&dataClass=knowledge&audience=public&scopeType=global&countOnly=true`),
        fetch(`/api/documents?businessId=${business.id}&dataClass=knowledge&audience=internal&scopeType=global&countOnly=true`),
        fetch(`/api/documents?businessId=${business.id}&scopeType=customer&countOnly=true`),
        fetch(`/api/documents?businessId=${business.id}&dataClass=stored_only&countOnly=true`),
      ])

      const [dokumenteData, internData, kundenData, archivData] = await Promise.all([
        dokumenteRes.json(),
        internRes.json(),
        kundenRes.json(),
        archivRes.json(),
      ])

      setCounts({
        dokumente: dokumenteData.count ?? dokumenteData.documents?.length ?? 0,
        intern: internData.count ?? internData.documents?.length ?? 0,
        kunden: kundenData.count ?? kundenData.documents?.length ?? 0,
        archiv: archivData.count ?? archivData.documents?.length ?? 0,
      })
    } catch (error) {
      log.error('Failed to fetch counts:', error)
    }
  }, [business?.id])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts, refreshKey])

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Lädt...</span>
        </div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Kein Unternehmen gefunden
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Bitte erstellen Sie zuerst ein Unternehmen, um den Chatbot zu nutzen.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* AI Literacy Warning Banner */}
      <AiLiteracyBanner businessId={business.id} />

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Chatbot & Daten</h1>
        <p className="mt-1 text-sm md:text-base text-gray-600">
          Verwalten Sie Ihre Wissensdatenbank, Gespräche, Einstellungen und Dokumente
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Chatbot-URL:{' '}
          <Link
            href={`/${business.slug}/chat`}
            className="text-primary hover:underline"
            target="_blank"
          >
            /{business.slug}/chat
          </Link>
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TooltipProvider delayDuration={0}>
          <div className="relative">
            {/* Scroll fade indicators */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-gray-50 to-transparent sm:hidden" />
            <TabsList className="flex w-full overflow-x-auto gap-0.5 justify-start no-scrollbar">
              {chatbotTabs.map((tab, index) => {
                const Icon = tab.icon
                const count = tab.value in counts ? counts[tab.value as keyof TabCounts] : undefined
                const showSeparator = index === 2 // After "Einstellungen", before data tabs

                return (
                  <div key={tab.value} className="flex items-center shrink-0">
                    {showSeparator && (
                      <Separator orientation="vertical" className="mx-1 h-5" />
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value={tab.value} className="flex shrink-0 items-center gap-1.5 px-2.5 sm:px-3">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="hidden sm:inline text-xs lg:text-sm">{tab.label}</span>
                          {count !== undefined && count > 0 && (
                            <span className={`ml-0.5 text-[10px] px-1.5 py-0 rounded-full ${countBadgeColors[tab.value] || 'bg-gray-100 text-gray-700'}`}>
                              {count}
                            </span>
                          )}
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="sm:hidden">
                        {tab.label}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )
              })}
            </TabsList>
          </div>
        </TooltipProvider>

        {/* Original 3 tab contents */}
        <TabsContent value="knowledge">
          <KnowledgeBaseTab businessId={business.id} />
        </TabsContent>

        <TabsContent value="conversations">
          <ConversationsTab businessId={business.id} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab business={business} />
        </TabsContent>

        {/* 4 data tab contents */}
        <TabsContent value="dokumente">
          <DataSection
            businessId={business.id}
            purpose="chatbot"
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="intern">
          <DataSection
            businessId={business.id}
            purpose="intern"
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="kunden">
          <DataSection
            businessId={business.id}
            purpose="kunden"
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="archiv">
          <DataSection
            businessId={business.id}
            purpose="daten"
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="integration">
          <EmbedCodeTab
            businessSlug={business.slug}
            businessName={business.name}
            defaultColor={business.chatbotColor || business.primaryColor}
          />
        </TabsContent>

      </Tabs>
    </div>
  )
}
