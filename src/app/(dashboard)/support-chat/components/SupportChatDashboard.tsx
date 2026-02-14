'use client'

import { useState } from 'react'
import { ConversationList } from './ConversationList'
import { ChatThread } from './ChatThread'
import { Headphones } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useIsMobile } from '@/hooks/use-mobile'

interface SupportChatDashboardProps {
  businessId: string
  businessName: string
}

export function SupportChatDashboard({ businessId, businessName }: SupportChatDashboardProps) {
  const t = useTranslations('dashboard.supportChat')
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const isMobile = useIsMobile()

  // Mobile: show either list or thread
  if (isMobile) {
    if (selectedConversationId) {
      return (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-sm text-gray-500">
              {t('subtitle')}
            </p>
          </div>
          <div className="h-[calc(100vh-180px)] min-h-[400px]">
            <ChatThread
              conversationId={selectedConversationId}
              onClose={() => setSelectedConversationId(null)}
              showBackButton
              onBack={() => setSelectedConversationId(null)}
            />
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500">
            {t('subtitle')}
          </p>
        </div>
        <div className="h-[calc(100vh-180px)] min-h-[400px]">
          <ConversationList
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
          />
        </div>
      </div>
    )
  }

  // Desktop: side-by-side layout
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-500">
          {t('subtitle')}
        </p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[500px]">
        {/* Left panel: conversation list */}
        <div className="w-80 shrink-0">
          <ConversationList
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
          />
        </div>

        {/* Right panel: chat thread */}
        <div className="flex-1 min-w-0">
          {selectedConversationId ? (
            <ChatThread
              conversationId={selectedConversationId}
              onClose={() => setSelectedConversationId(null)}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border bg-white">
              <div className="text-center text-gray-500">
                <Headphones className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <p className="text-lg font-medium">{t('noOpenConversations')}</p>
                <p className="mt-1 text-sm">
                  {t('selectConversation')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
