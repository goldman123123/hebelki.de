'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, Bot, User, UserCheck, X, ArrowLeft } from 'lucide-react'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboard:support-chat:ChatThread')

interface Message {
  id: string
  role: string
  content: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

interface ChatThreadProps {
  conversationId: string
  onClose: () => void
  showBackButton?: boolean
  onBack?: () => void
}

const statusLabels: Record<string, { label: string; color: string }> = {
  live_queue: { label: 'Wartend', color: 'bg-yellow-100 text-yellow-800' },
  live_active: { label: 'Aktiv', color: 'bg-green-100 text-green-800' },
  escalated: { label: 'Eskaliert', color: 'bg-red-100 text-red-800' },
  closed: { label: 'Geschlossen', color: 'bg-gray-100 text-gray-800' },
}

export function ChatThread({ conversationId, onClose, showBackButton, onBack }: ChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('live_queue')
  const [closing, setClosing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMessageTime = useRef<string | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Fetch all messages initially
  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chatbot/support/conversations/${conversationId}/messages`)
      const data = await res.json()
      if (data.success) {
        setMessages(data.messages)
        setStatus(data.conversationStatus)
        if (data.messages.length > 0) {
          lastMessageTime.current = data.messages[data.messages.length - 1].createdAt
        }
      }
    } catch (error) {
      log.error('Failed to fetch messages:', error)
    } finally {
      setLoading(false)
    }
  }

  // Poll for new messages (deduplicates by ID)
  const pollMessages = async () => {
    if (!lastMessageTime.current) return
    try {
      const res = await fetch(
        `/api/chatbot/support/conversations/${conversationId}/messages?since=${encodeURIComponent(lastMessageTime.current)}`
      )
      const data = await res.json()
      if (data.success && data.messages.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id))
          const newMsgs = data.messages.filter((m: Message) => !existingIds.has(m.id))
          return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev
        })
        setStatus(data.conversationStatus)
        lastMessageTime.current = data.messages[data.messages.length - 1].createdAt
      }
    } catch (error) {
      log.error('Failed to poll messages:', error)
    }
  }

  useEffect(() => {
    setLoading(true)
    setMessages([])
    lastMessageTime.current = null
    fetchMessages()

    intervalRef.current = setInterval(pollMessages, 3000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sending) return

    const text = input.trim()
    setInput('')
    setSending(true)

    try {
      const res = await fetch(`/api/chatbot/support/conversations/${conversationId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      const data = await res.json()
      if (data.success) {
        setMessages(prev => [...prev, data.message])
        lastMessageTime.current = data.message.createdAt
        if (status === 'live_queue' || status === 'escalated') {
          setStatus('live_active')
        }
      }
    } catch (error) {
      log.error('Failed to send reply:', error)
    } finally {
      setSending(false)
    }
  }

  const handleClose = async () => {
    if (closing) return
    setClosing(true)

    try {
      const res = await fetch(`/api/chatbot/support/conversations/${conversationId}/close`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        setStatus('closed')
        onClose()
      }
    } catch (error) {
      log.error('Failed to close conversation:', error)
    } finally {
      setClosing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const statusInfo = statusLabels[status] || { label: status, color: 'bg-gray-100 text-gray-800' }

  return (
    <Card className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Zurück</span>
            </Button>
          )}
          <span className="text-sm font-semibold text-gray-900 truncate">Gespräch</span>
          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {status !== 'closed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={closing}
            >
              {closing ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              <span className="ml-1 hidden sm:inline">Schließen</span>
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Keine Nachrichten
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.role === 'system') {
              return (
                <div key={msg.id} className="text-center">
                  <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs italic text-gray-500">
                    {msg.content}
                  </span>
                </div>
              )
            }

            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex gap-2 justify-start">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-gray-400 mb-0.5">Kunde</p>
                    <div className="rounded-lg bg-gray-100 px-3 py-2 max-w-md">
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(msg.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            }

            if (msg.role === 'assistant') {
              return (
                <div key={msg.id} className="flex gap-2 justify-start">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-blue-500 mb-0.5">KI-Assistent</p>
                    <div className="rounded-lg bg-blue-50 px-3 py-2 max-w-md">
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(msg.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            }

            if (msg.role === 'staff') {
              const meta = msg.metadata as Record<string, unknown> | null
              const staffName = (meta?.staffName as string) || 'Support'
              return (
                <div key={msg.id} className="flex gap-2 justify-end">
                  <div className="text-right min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-green-600 mb-0.5">{staffName}</p>
                    <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 max-w-md ml-auto">
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(msg.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <UserCheck className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              )
            }

            return null
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply input */}
      {status !== 'closed' && (
        <div className="border-t p-3">
          <div className="flex gap-2">
            <Input
              placeholder="Antwort eingeben..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={sending}
            />
            <Button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              size="sm"
              className="shrink-0"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
