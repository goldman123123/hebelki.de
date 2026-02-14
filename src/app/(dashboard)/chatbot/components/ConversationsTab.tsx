'use client'

/**
 * Conversations Tab
 *
 * View and manage chatbot conversations
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, MessageSquare, User, Bot, UserCheck, Calendar, Globe, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboard:chatbot:ConversationsTab')

interface Conversation {
  id: string
  channel: string
  status: string
  hasStaffMessages?: boolean
  createdAt: string
  updatedAt: string
}

interface Message {
  id: string
  role: string
  content: string
  metadata?: Record<string, unknown> | null
  createdAt: string
}

interface ConversationsTabProps {
  businessId: string
}

export function ConversationsTab({ businessId }: ConversationsTabProps) {
  const t = useTranslations('dashboard.chatbot.conversations')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const fetchConversations = async () => {
    try {
      const response = await fetch(`/api/chatbot/conversations?businessId=${businessId}`)
      const data = await response.json()

      if (data.success) {
        setConversations(data.conversations || [])
      }
    } catch (error) {
      log.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true)
    try {
      const response = await fetch(`/api/chatbot/conversations/${conversationId}`)
      const data = await response.json()

      if (data.success) {
        setMessages(data.messages || [])
      }
    } catch (error) {
      log.error('Failed to fetch messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [businessId])

  const handleViewConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setIsDialogOpen(true)
    await fetchMessages(conversation.id)
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'web':
        return <Globe className="h-4 w-4" />
      case 'whatsapp':
        return <MessageCircle className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'live_queue':
        return 'bg-yellow-100 text-yellow-800'
      case 'live_active':
        return 'bg-green-100 text-green-800'
      case 'escalated':
        return 'bg-red-100 text-red-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return t('statusActive')
      case 'live_queue':
        return t('statusQueued')
      case 'live_active':
        return t('statusLive')
      case 'escalated':
        return t('statusEscalated')
      case 'closed':
        return t('statusClosed')
      default:
        return status
    }
  }

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t('loading')}</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {t('title')}
        </h2>
        <p className="text-sm text-gray-500">
          {t('subtitle')}
        </p>
      </div>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {t('noConversations')}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {t('noConversationsDesc')}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => (
            <Card key={conversation.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      {getChannelIcon(conversation.channel)}
                      <span className="capitalize">{conversation.channel}</span>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(conversation.status)}`}>
                      {getStatusLabel(conversation.status)}
                    </span>
                    {conversation.hasStaffMessages && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-800 px-2.5 py-0.5 text-xs font-medium">
                        <UserCheck className="h-3 w-3" />
                        {t('staff')}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {t('started')} {formatDistanceToNow(new Date(conversation.createdAt), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </span>
                    <span>
                      {t('lastActivity')} {formatDistanceToNow(new Date(conversation.updatedAt), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewConversation(conversation)}
                >
                  {t('view')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Conversation Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{t('history')}</DialogTitle>
            <DialogDescription>
              {selectedConversation && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="capitalize">{selectedConversation.channel}</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(selectedConversation.createdAt), {
                      addSuffix: true,
                      locale: de,
                    })}
                  </span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[500px] overflow-y-auto py-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{t('loadingMessages')}</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                {t('noMessages')}
              </div>
            ) : (
              <div className="space-y-4">
                {messages
                  .filter(m => m.role !== 'tool')
                  .map((message) => {
                    // System messages: centered
                    if (message.role === 'system') {
                      return (
                        <div key={message.id} className="text-center">
                          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs italic text-gray-500">
                            {message.content}
                          </span>
                        </div>
                      )
                    }

                    // Staff messages: right-aligned with green accent
                    if (message.role === 'staff') {
                      const staffName = (message.metadata?.staffName as string) || 'Support'
                      return (
                        <div key={message.id} className="flex gap-3 justify-end">
                          <div className="text-right">
                            <p className="text-[10px] font-medium text-purple-600 mb-0.5">{staffName}</p>
                            <div className="max-w-[70%] ml-auto rounded-lg bg-purple-50 border border-purple-200 px-4 py-2">
                              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                              <p className="mt-1 text-xs text-gray-500">
                                {new Date(message.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 flex-shrink-0">
                            <UserCheck className="h-5 w-5 text-purple-600" />
                          </div>
                        </div>
                      )
                    }

                    return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
                          <Bot className="h-5 w-5 text-blue-600" />
                        </div>
                      )}

                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <p className="text-[10px] font-medium text-blue-500 mb-0.5">{t('aiAssistant')}</p>
                        )}
                        <p className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </p>
                        <p
                          className={`mt-1 text-xs ${
                            message.role === 'user'
                              ? 'text-blue-100'
                              : 'text-gray-500'
                          }`}
                        >
                          {new Date(message.createdAt).toLocaleTimeString('de-DE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      {message.role === 'user' && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 flex-shrink-0">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                      )}
                    </div>
                    )
                  })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
