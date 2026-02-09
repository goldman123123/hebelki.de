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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Book, MessageSquare, Settings, Loader2, AlertCircle, FileText, Building2, User, Database } from 'lucide-react'
import { KnowledgeBaseTab } from './components/KnowledgeBaseTab'
import { ConversationsTab } from './components/ConversationsTab'
import { SettingsTab } from './components/SettingsTab'
import { DataSection } from './components/data/DataSection'
import { AiLiteracyBanner } from '@/components/dashboard/AiLiteracyBanner'
import Link from 'next/link'

interface Business {
  id: string
  name: string
  slug: string
  type: string | null
}

interface TabCounts {
  dokumente: number
  intern: number
  kunden: number
  archiv: number
}

export default function ChatbotDashboardPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [knowledgeCount, setKnowledgeCount] = useState<number | null>(null)
  const [counts, setCounts] = useState<TabCounts>({ dokumente: 0, intern: 0, kunden: 0, archiv: 0 })
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState('knowledge')

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        // Fetch the user's businesses from the new endpoint
        const response = await fetch('/api/businesses/my')
        const data = await response.json()

        if (data.success && data.businesses.length > 0) {
          // Use the first business the user has access to
          const firstBusiness = data.businesses[0]
          setBusiness({
            id: firstBusiness.business.id,
            name: firstBusiness.business.name,
            slug: firstBusiness.business.slug,
            type: firstBusiness.business.type,
          })
        }
      } catch (error) {
        console.error('Failed to fetch business:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBusiness()
  }, [])

  // Check knowledge base count
  useEffect(() => {
    if (!business) return

    const checkKnowledge = async () => {
      try {
        const response = await fetch(`/api/chatbot/knowledge?businessId=${business.id}`)
        const data = await response.json()
        setKnowledgeCount(data.entries?.length || 0)
      } catch (error) {
        console.error('Failed to fetch knowledge count:', error)
      }
    }

    checkKnowledge()
  }, [business])

  // Fetch document counts for all 4 document tabs
  const fetchCounts = useCallback(async () => {
    if (!business?.id) return

    try {
      // Fetch counts for all 4 categories in parallel
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
      console.error('Failed to fetch counts:', error)
    }
  }, [business?.id])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts, refreshKey])

  // Handle refresh from child components
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
        <h1 className="text-3xl font-bold text-gray-900">Chatbot & Daten</h1>
        <p className="mt-2 text-gray-600">
          Verwalten Sie Ihre Wissensdatenbank, Gespräche, Einstellungen und Dokumente
        </p>
      </div>

      {/* Setup Banner */}
      {knowledgeCount === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Complete Chatbot Setup</AlertTitle>
          <AlertDescription>
            Your chatbot has no knowledge yet. Add knowledge entries or test the chatbot to get started.
          </AlertDescription>
          <Button asChild className="mt-4">
            <Link href={`/${business.slug}/chat`}>
              Test Chatbot
            </Link>
          </Button>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 lg:w-auto">
          {/* Original 3 tabs */}
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <Book className="h-4 w-4" />
            <span className="hidden sm:inline">Wissensdatenbank</span>
            <span className="sm:hidden">Wissen</span>
          </TabsTrigger>
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Gespräche</span>
            <span className="sm:hidden">Chats</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Einstellungen</span>
          </TabsTrigger>

          {/* 4 new data tabs */}
          <TabsTrigger value="dokumente" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Dokumente</span>
            {counts.dokumente > 0 && (
              <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                {counts.dokumente}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="intern" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>Intern</span>
            {counts.intern > 0 && (
              <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                {counts.intern}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="kunden" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Kunden</span>
            {counts.kunden > 0 && (
              <span className="ml-1 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                {counts.kunden}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="archiv" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>Archiv</span>
            {counts.archiv > 0 && (
              <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                {counts.archiv}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

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

        {/* 4 new data tab contents */}
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
      </Tabs>
    </div>
  )
}
