'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Conversation {
  id: string
  status: string
  channel: string
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  customerId: string | null
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  lastMessage: {
    content: string
    role: string
    createdAt: string
  } | null
  unreadCount: number
}

interface ConversationListProps {
  selectedId: string | null
  onSelect: (id: string) => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Jetzt'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  live_queue: { label: 'Wartend', variant: 'secondary' },
  live_active: { label: 'Aktiv', variant: 'default' },
  escalated: { label: 'Eskaliert', variant: 'destructive' },
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/chatbot/support/conversations')
      const data = await res.json()
      if (data.success) {
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
    intervalRef.current = setInterval(fetchConversations, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  if (loading) {
    return (
      <Card className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </Card>
    )
  }

  if (conversations.length === 0) {
    return (
      <Card className="flex h-full items-center justify-center p-6">
        <div className="text-center text-gray-500">
          <p className="text-sm">Keine offenen Gespräche</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="border-b p-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Gespräche ({conversations.length})
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => {
          const config = statusConfig[conv.status] || { label: conv.status, variant: 'outline' as const }
          const displayName = conv.customerName || conv.customerEmail || 'Unbekannter Kunde'

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                'w-full border-b p-3 text-left transition-colors hover:bg-gray-50',
                selectedId === conv.id && 'bg-blue-50 hover:bg-blue-50'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {displayName}
                    </p>
                    {conv.lastMessage && (
                      <p className="truncate text-xs text-gray-500">
                        {conv.lastMessage.role === 'staff' ? 'Sie: ' : ''}
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-gray-400">
                    {conv.updatedAt ? timeAgo(conv.updatedAt) : ''}
                  </span>
                  <div className="flex items-center gap-1">
                    <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">
                      {config.label}
                    </Badge>
                    {conv.unreadCount > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
