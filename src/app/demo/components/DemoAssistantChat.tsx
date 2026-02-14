'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, Sparkles, User } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface DemoAssistantChatProps {
  businessId: string
  businessName: string
  primaryColor?: string
}

export function DemoAssistantChat({
  businessId,
  businessName,
  primaryColor = '#3B82F6',
}: DemoAssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
      const response = await fetch('/api/demo/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          conversationId,
          content: input,
          mode: 'assistant',
        }),
      })

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const data = await response.json()

      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId)
      }

      if (data.response) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch {
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

  return (
    <Card className="flex h-[500px] flex-col">
      {/* Header badge */}
      <div className="border-b px-4 py-2">
        <Badge variant="secondary" className="text-xs">
          <Sparkles className="h-3 w-3 mr-1" />
          Interner Assistent
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <Sparkles
                className="mx-auto mb-4 h-12 w-12"
                style={{ color: primaryColor }}
              />
              <h3 className="text-lg font-medium text-gray-900">
                Hallo! Ich bin Ihr virtueller Assistent für {businessName}.
              </h3>
              <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                Fragen Sie mich nach Ihren Terminen, dem Tagesplan oder geben Sie mir Anweisungen.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    <Sparkles className="h-4 w-4" style={{ color: primaryColor }} />
                  </div>
                )}

                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-gray-800 text-white'
                      : 'border bg-white text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  <p
                    className={`mt-1 text-xs ${
                      message.role === 'user' ? 'opacity-70' : 'text-gray-400'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Sparkles className="h-4 w-4" style={{ color: primaryColor }} />
                </div>
                <div className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-500">Denkt nach...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Nachricht eingeben..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
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
      </div>
    </Card>
  )
}
