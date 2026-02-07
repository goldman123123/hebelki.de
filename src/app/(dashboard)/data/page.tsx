'use client'

/**
 * Data Dashboard - Purpose-Based Organization
 *
 * 4 tabs organized by document purpose:
 * - Chatbot: Public knowledge for chatbot (audience=public, scopeType=global, dataClass=knowledge)
 * - Intern: Internal staff documents (audience=internal, scopeType=global, dataClass=knowledge)
 * - Kunden: Customer-specific documents (scopeType=customer, dataClass=knowledge)
 * - Daten: Business data storage (dataClass=stored_only)
 *
 * Each tab has its own upload zone with fixed, safe classification.
 * No dangerous defaults - the tab itself defines the classification.
 */

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Bot, Building2, User, Database, Loader2 } from 'lucide-react'
import { DataSection } from './components/DataSection'

interface Business {
  id: string
  name: string
  slug: string
  type: string | null
}

interface TabCounts {
  chatbot: number
  intern: number
  kunden: number
  daten: number
}

export default function DataDashboardPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<TabCounts>({ chatbot: 0, intern: 0, kunden: 0, daten: 0 })
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState('chatbot')

  // Fetch business
  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const response = await fetch('/api/businesses/my')
        const data = await response.json()

        if (data.success && data.businesses.length > 0) {
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

  // Fetch counts for all tabs
  const fetchCounts = useCallback(async () => {
    if (!business?.id) return

    try {
      // Fetch counts for all 4 categories in parallel
      const [chatbotRes, internRes, kundenRes, datenRes] = await Promise.all([
        fetch(`/api/documents?businessId=${business.id}&dataClass=knowledge&audience=public&scopeType=global&countOnly=true`),
        fetch(`/api/documents?businessId=${business.id}&dataClass=knowledge&audience=internal&scopeType=global&countOnly=true`),
        fetch(`/api/documents?businessId=${business.id}&scopeType=customer&countOnly=true`),
        fetch(`/api/documents?businessId=${business.id}&dataClass=stored_only&countOnly=true`),
      ])

      const [chatbotData, internData, kundenData, datenData] = await Promise.all([
        chatbotRes.json(),
        internRes.json(),
        kundenRes.json(),
        datenRes.json(),
      ])

      setCounts({
        chatbot: chatbotData.count ?? chatbotData.documents?.length ?? 0,
        intern: internData.count ?? internData.documents?.length ?? 0,
        kunden: kundenData.count ?? kundenData.documents?.length ?? 0,
        daten: datenData.count ?? datenData.documents?.length ?? 0,
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
            Bitte erstellen Sie zuerst ein Unternehmen, um Daten zu verwalten.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Daten</h1>
        <p className="mt-2 text-gray-600">
          Verwalten Sie Dokumente und Datenquellen für Ihren Chatbot
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 lg:w-auto">
          {/* Chatbot Tab */}
          <TabsTrigger value="chatbot" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span>Chatbot</span>
            {counts.chatbot > 0 && (
              <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                {counts.chatbot}
              </span>
            )}
          </TabsTrigger>

          {/* Intern Tab */}
          <TabsTrigger value="intern" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>Intern</span>
            {counts.intern > 0 && (
              <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                {counts.intern}
              </span>
            )}
          </TabsTrigger>

          {/* Kunden Tab */}
          <TabsTrigger value="kunden" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Kunden</span>
            {counts.kunden > 0 && (
              <span className="ml-1 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                {counts.kunden}
              </span>
            )}
          </TabsTrigger>

          {/* Daten Tab */}
          <TabsTrigger value="daten" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>Daten</span>
            {counts.daten > 0 && (
              <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                {counts.daten}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab Contents */}
        <TabsContent value="chatbot">
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

        <TabsContent value="daten">
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
