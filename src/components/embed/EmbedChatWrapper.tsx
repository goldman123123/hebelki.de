'use client'

import { useEffect } from 'react'
import { ChatInterface } from '@/modules/chatbot/components/ChatInterface'
import { sendToParent } from '@/lib/embed/post-message'

interface EmbedChatWrapperProps {
  businessId: string
  businessName: string
  slug: string
  primaryColor: string
  welcomeMessage: string
  liveChatEnabled: boolean
  chatDefaultMode: 'ai' | 'live'
}

export function EmbedChatWrapper({
  businessId,
  businessName,
  slug,
  primaryColor,
  welcomeMessage,
  liveChatEnabled,
  chatDefaultMode,
}: EmbedChatWrapperProps) {
  useEffect(() => {
    sendToParent('hebelki:chat-ready', slug, {})
  }, [slug])

  const handleNewMessage = (role: string) => {
    sendToParent('hebelki:new-message', slug, { role })
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex-1 min-h-0">
        <ChatInterface
          businessId={businessId}
          businessName={businessName}
          primaryColor={primaryColor}
          welcomeMessage={welcomeMessage}
          liveChatEnabled={liveChatEnabled}
          chatDefaultMode={chatDefaultMode}
          onNewMessage={handleNewMessage}
        />
      </div>
      <div className="flex-shrink-0 border-t bg-gray-50 px-3 py-1.5 text-center">
        <a
          href="https://www.hebelki.de"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Powered by Hebelki
        </a>
      </div>
    </div>
  )
}
