'use client'

/**
 * Chatbot Dashboard
 *
 * Manage chatbot knowledge base, conversations, and settings
 */

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Book, MessageSquare, Settings, Loader2, AlertCircle } from 'lucide-react'
import { KnowledgeBaseTab } from './components/KnowledgeBaseTab'
import { ConversationsTab } from './components/ConversationsTab'
import { SettingsTab } from './components/SettingsTab'
import Link from 'next/link'

interface Business {
  id: string
  name: string
  slug: string
  type: string | null
}

export default function ChatbotDashboardPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [knowledgeCount, setKnowledgeCount] = useState<number | null>(null)

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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Chatbot Einstellungen</h1>
        <p className="mt-2 text-gray-600">
          Verwalten Sie Ihre Wissensdatenbank, Gespräche und Chatbot-Einstellungen
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
      <Tabs defaultValue="knowledge" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
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
        </TabsList>

        <TabsContent value="knowledge">
          <KnowledgeBaseTab businessId={business.id} />
        </TabsContent>

        <TabsContent value="conversations">
          <ConversationsTab businessId={business.id} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab business={business} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
