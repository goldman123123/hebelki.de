'use client'

/**
 * Reusable Chat Interface Component
 *
 * Used for public chat pages and embedded widgets.
 * Supports AI mode, live chat mode, and live-first mode.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Loader2, Send, Bot, User, UserCheck } from 'lucide-react'
import { VoiceRecorder } from './VoiceRecorder'
import { createLogger } from '@/lib/logger'

const log = createLogger('chatbot:ChatInterface')

// Renders text with clickable links
function Linkify({ children, className }: { children: string; className?: string }) {
  const parts = children.split(/(https?:\/\/[^\s<]+)/g)

  return (
    <p className={className}>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline break-all"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  )
}

interface Message {
  role: 'user' | 'assistant' | 'staff' | 'system'
  content: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

interface ChatInterfaceProps {
  businessId: string
  businessName: string
  primaryColor?: string
  welcomeMessage?: string
  liveChatEnabled?: boolean
  chatDefaultMode?: 'ai' | 'live'
  onNewMessage?: (role: string) => void
}

export function ChatInterface({
  businessId,
  businessName,
  primaryColor = '#3B82F6',
  welcomeMessage = 'Willkommen! Wie kann ich Ihnen helfen?',
  liveChatEnabled = false,
  chatDefaultMode = 'ai',
  onNewMessage,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isEscalated, setIsEscalated] = useState(false)
  const [awaitingContact, setAwaitingContact] = useState(false)
  const [isLiveChatMode, setIsLiveChatMode] = useState(false)
  const [staffJoined, setStaffJoined] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPollTime = useRef<string | null>(null)
  const seenMessageIds = useRef<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [])

  // Start polling for staff messages
  const startPolling = useCallback((convId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current)

    lastPollTime.current = new Date().toISOString()

    pollingRef.current = setInterval(async () => {
      try {
        const since = lastPollTime.current || new Date().toISOString()
        const res = await fetch(
          `/api/chatbot/poll?conversationId=${convId}&since=${encodeURIComponent(since)}`
        )
        const data = await res.json()

        if (data.success) {
          // Append new staff/system/assistant messages (deduplicate by ID)
          if (data.messages && data.messages.length > 0) {
            const unseenMsgs = data.messages.filter((m: { id: string }) => !seenMessageIds.current.has(m.id))
            if (unseenMsgs.length > 0) {
              const newMsgs: Message[] = unseenMsgs.map((m: { role: string; content: string; createdAt: string; metadata?: Record<string, unknown> }) => ({
                role: m.role as Message['role'],
                content: m.content,
                timestamp: new Date(m.createdAt),
                metadata: m.metadata,
              }))
              unseenMsgs.forEach((m: { id: string }) => seenMessageIds.current.add(m.id))
              setMessages(prev => [...prev, ...newMsgs])
              newMsgs.forEach((m: Message) => onNewMessage?.(m.role))

              // If any staff message arrived, staff has joined
              if (unseenMsgs.some((m: { role: string }) => m.role === 'staff')) {
                setStaffJoined(true)
              }
            }
            lastPollTime.current = data.messages[data.messages.length - 1].createdAt
          }

          // Handle system messages (timeout, AI fallback)
          if (data.systemMessage) {
            setMessages(prev => [...prev, {
              role: 'system',
              content: data.systemMessage,
              timestamp: new Date(),
            }])

            // If reverted to AI mode, stop polling
            if (data.status === 'active') {
              setIsLiveChatMode(false)
              if (pollingRef.current) {
                clearInterval(pollingRef.current)
                pollingRef.current = null
              }
            }
          }
        }
      } catch (error) {
        log.error('Polling error:', error)
      }
    }, 3000)
  }, [])

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chatbot/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          conversationId,
          message: input,
          channel: 'web',
        }),
      })

      if (!response.ok) {
        let errorMessage = 'API request failed'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // ignore parse error
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      if (!conversationId) {
        setConversationId(data.conversationId)
      }

      // Check if live chat mode was activated
      if (data.metadata?.liveChatMode) {
        setIsLiveChatMode(true)
        startPolling(data.conversationId || conversationId!)
      }

      // Check if escalation was completed (legacy flow)
      if (data.metadata?.escalated) {
        setIsEscalated(true)
        setAwaitingContact(false)
      }

      // Add response message (AI or system response)
      if (data.response) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
        onNewMessage?.('assistant')
      }
    } catch (error) {
      log.error('Chat error:', error)

      const errorMessage: Message = {
        role: 'assistant',
        content: 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Handle transcription from voice recorder
  const handleTranscription = useCallback((text: string) => {
    setInput(text)
  }, [])

  const handleEscalate = async () => {
    if (!conversationId) {
      alert('Bitte senden Sie zuerst eine Nachricht.')
      return
    }

    try {
      const response = await fetch('/api/chatbot/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      })

      const data = await response.json()

      if (response.ok) {
        // Add the response message
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        }])

        // If live chat mode activated, start polling
        if (data.liveChatMode) {
          setIsLiveChatMode(true)
          startPolling(conversationId)
        }

        // Legacy flow: awaiting contact info
        if (data.awaitingContactInfo) {
          setAwaitingContact(true)
        }
      } else {
        log.error('Escalation failed:', data.error)
        alert('Fehler beim Weiterleiten. Bitte versuchen Sie es erneut.')
      }
    } catch (error) {
      log.error('Escalation error:', error)
      alert('Fehler beim Weiterleiten. Bitte versuchen Sie es erneut.')
    }
  }

  return (
    <Card className="flex h-[600px] flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <Bot
                className="mx-auto mb-4 h-12 w-12"
                style={{ color: primaryColor }}
              />
              <h3 className="text-lg font-medium text-gray-900">
                {welcomeMessage}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {liveChatEnabled && chatDefaultMode === 'live'
                  ? 'Schreiben Sie uns eine Nachricht, unser Team antwortet in Kürze.'
                  : 'Stellen Sie eine Frage oder bitten Sie um einen Termin.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              // System messages: centered
              if (message.role === 'system') {
                return (
                  <div key={index} className="text-center">
                    <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs italic text-gray-500">
                      {message.content}
                    </span>
                  </div>
                )
              }

              // Staff messages: left-aligned with UserCheck icon
              if (message.role === 'staff') {
                const staffName = (message.metadata?.staffName as string) || 'Support'
                return (
                  <div key={index} className="flex gap-3 justify-start">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                      <UserCheck className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-green-600 mb-0.5">{staffName}</p>
                      <div className="max-w-[70%] rounded-lg bg-green-50 border border-green-200 px-4 py-2">
                        <Linkify className="whitespace-pre-wrap text-sm">{message.content}</Linkify>
                        <p className="mt-1 text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString('de-DE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              }

              // User and assistant messages (existing rendering)
              return (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${primaryColor}20` }}
                    >
                      <Bot className="h-5 w-5" style={{ color: primaryColor }} />
                    </div>
                  )}

                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                    style={message.role === 'user' ? { backgroundColor: primaryColor } : {}}
                  >
                    <Linkify className="whitespace-pre-wrap text-sm">{message.content}</Linkify>
                    <p
                      className={`mt-1 text-xs ${
                        message.role === 'user'
                          ? 'opacity-80'
                          : 'text-gray-500'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {message.role === 'user' && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                  )}
                </div>
              )
            })}

            {isLoading && (
              <div className="flex gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <Bot className="h-5 w-5" style={{ color: primaryColor }} />
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                  <span className="text-sm text-gray-600">
                    {isLiveChatMode ? 'Wird gesendet...' : 'Denkt nach...'}
                  </span>
                </div>
              </div>
            )}

            {isLiveChatMode && !isLoading && !staffJoined && (
              <div className="text-center">
                <span className="inline-block rounded-full bg-yellow-50 border border-yellow-200 px-3 py-1 text-xs text-yellow-700">
                  Warten auf Mitarbeiter...
                </span>
              </div>
            )}

            {isLiveChatMode && !isLoading && staffJoined && (
              <div className="text-center">
                <span className="inline-block rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs text-green-700">
                  Mitarbeiter ist verbunden
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Nachricht eingeben..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <VoiceRecorder
            businessId={businessId}
            onTranscription={handleTranscription}
            disabled={isLoading}
            primaryColor={primaryColor}
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            style={{ backgroundColor: primaryColor }}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Escalation Button - only show in AI mode when not already in live chat */}
        {!isEscalated && !isLiveChatMode && chatDefaultMode !== 'live' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleEscalate}
            className="w-full text-xs"
            disabled={!conversationId}
          >
            <User className="h-3 w-3 mr-2" />
            Mit einem Menschen sprechen
          </Button>
        )}

        {isEscalated && !isLiveChatMode && (
          <div className="text-xs text-center text-green-600">
            An Team weitergeleitet
          </div>
        )}
      </div>
    </Card>
  )
}
