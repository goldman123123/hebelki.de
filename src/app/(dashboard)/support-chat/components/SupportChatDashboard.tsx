'use client'

import { useState } from 'react'
import { ConversationList } from './ConversationList'
import { ChatThread } from './ChatThread'
import { Headphones } from 'lucide-react'

interface SupportChatDashboardProps {
  businessId: string
  businessName: string
}

export function SupportChatDashboard({ businessId, businessName }: SupportChatDashboardProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Live-Chat</h1>
        <p className="text-sm text-gray-500">
          Beantworten Sie Kundenanfragen in Echtzeit
        </p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[500px]">
        {/* Left panel: conversation list */}
        <div className="w-1/3 min-w-[300px]">
          <ConversationList
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
          />
        </div>

        {/* Right panel: chat thread */}
        <div className="flex-1">
          {selectedConversationId ? (
            <ChatThread
              conversationId={selectedConversationId}
              onClose={() => setSelectedConversationId(null)}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border bg-white">
              <div className="text-center text-gray-500">
                <Headphones className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <p className="text-lg font-medium">Keine offenen Gespräche</p>
                <p className="mt-1 text-sm">
                  Wählen Sie ein Gespräch aus der Liste aus
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
