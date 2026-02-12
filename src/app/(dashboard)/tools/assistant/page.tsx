'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bot, Send, Loader2, Plus, Calendar, FileText, Users, Paperclip, X, Download, MessageSquare, Settings, Wrench, UserCog, Mail, ChevronDown, Lightbulb, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { VoiceRecorder } from '@/modules/chatbot/components/VoiceRecorder'

const STORAGE_KEY = 'hebelki-assistant-conversation'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface UploadedFile {
  documentId: string
  versionId: string
  r2Key: string
  filename: string
  contentType: string
  fileSize: number
}

const QUICK_ACTIONS_PRIMARY = [
  { label: 'Heutige Termine', prompt: 'Zeige mir die heutigen Termine', icon: Calendar },
  { label: 'Offene Rechnungen', prompt: 'Zeige mir alle offenen Rechnungen', icon: FileText },
  { label: 'Monatsübersicht', prompt: 'Zeige mir die Monatsübersicht für den aktuellen Monat', icon: Calendar },
  { label: 'Kunden suchen', prompt: 'Ich möchte einen Kunden suchen', icon: Users },
]

const QUICK_ACTIONS_MORE = [
  { label: 'Rechnung erstellen', prompt: 'Ich möchte eine Rechnung erstellen', icon: FileText },
  { label: 'WhatsApp senden', prompt: 'Ich möchte eine WhatsApp-Nachricht an einen Kunden senden', icon: MessageSquare },
  { label: 'Mitarbeiter verwalten', prompt: 'Zeige mir alle Mitarbeiter', icon: UserCog },
  { label: 'Krankheitsvertretung', prompt: 'Ein Mitarbeiter ist krank, welche Termine sind betroffen?', icon: Users },
  { label: 'Dienstleistung anlegen', prompt: 'Ich möchte eine neue Dienstleistung anlegen', icon: Wrench },
  { label: 'Öffnungszeiten ändern', prompt: 'Ich möchte die Öffnungszeiten ändern', icon: Clock },
]

const CAPABILITIES = [
  {
    category: 'Termine & Buchungen',
    icon: Calendar,
    items: [
      { label: 'Tagesübersicht', prompt: 'Zeige mir die heutigen Termine' },
      { label: 'Buchung erstellen', prompt: 'Ich möchte einen neuen Termin für einen Kunden erstellen' },
      { label: 'Buchung stornieren', prompt: 'Ich möchte eine Buchung stornieren' },
      { label: 'Termine umbuchen', prompt: 'Ich möchte einen Termin verschieben' },
      { label: 'Kalenderübersicht', prompt: 'Zeige mir die Monatsübersicht für den aktuellen Monat' },
      { label: 'Nächste 7 Tage', prompt: 'Zeige mir die Buchungen der nächsten 7 Tage' },
    ],
  },
  {
    category: 'Kunden',
    icon: Users,
    items: [
      { label: 'Kunden suchen', prompt: 'Ich möchte einen Kunden suchen' },
      { label: 'Kunden anlegen', prompt: 'Ich möchte einen neuen Kunden anlegen' },
      { label: 'Kunden bearbeiten', prompt: 'Ich möchte die Daten eines Kunden aktualisieren' },
      { label: 'Kunden löschen', prompt: 'Ich möchte einen Kunden löschen' },
      { label: 'Kundenbuchungen anzeigen', prompt: 'Zeige mir alle Buchungen eines Kunden' },
    ],
  },
  {
    category: 'Rechnungen',
    icon: FileText,
    items: [
      { label: 'Rechnung erstellen', prompt: 'Ich möchte eine Rechnung erstellen' },
      { label: 'Rechnung versenden', prompt: 'Ich möchte eine Rechnung per E-Mail versenden' },
      { label: 'Zahlung vermerken', prompt: 'Ich möchte eine Rechnung als bezahlt markieren' },
      { label: 'Stornierung', prompt: 'Ich möchte eine Rechnung stornieren' },
      { label: 'Offene Rechnungen', prompt: 'Zeige mir alle offenen Rechnungen' },
      { label: 'Lieferschein erstellen', prompt: 'Ich möchte einen Lieferschein erstellen' },
    ],
  },
  {
    category: 'Team',
    icon: UserCog,
    items: [
      { label: 'Mitarbeiter anlegen', prompt: 'Ich möchte einen neuen Mitarbeiter anlegen' },
      { label: 'Mitarbeiter bearbeiten', prompt: 'Ich möchte die Daten eines Mitarbeiters ändern' },
      { label: 'Mitarbeiter löschen', prompt: 'Ich möchte einen Mitarbeiter entfernen' },
      { label: 'Dienst zuweisen', prompt: 'Ich möchte einem Mitarbeiter eine Dienstleistung zuweisen' },
      { label: 'Krankheitsvertretung', prompt: 'Ein Mitarbeiter ist krank, welche Termine sind betroffen?' },
      { label: 'Verfügbarkeit ändern', prompt: 'Ich möchte die Verfügbarkeit eines Mitarbeiters ändern' },
    ],
  },
  {
    category: 'Dienstleistungen',
    icon: Wrench,
    items: [
      { label: 'Service anlegen', prompt: 'Ich möchte eine neue Dienstleistung anlegen' },
      { label: 'Service bearbeiten', prompt: 'Ich möchte eine Dienstleistung bearbeiten' },
      { label: 'Service löschen', prompt: 'Ich möchte eine Dienstleistung deaktivieren' },
      { label: 'Mitarbeiter-Priorität', prompt: 'Ich möchte die Mitarbeiter-Priorität für eine Dienstleistung ändern' },
    ],
  },
  {
    category: 'Kommunikation',
    icon: Mail,
    items: [
      { label: 'WhatsApp senden', prompt: 'Ich möchte eine WhatsApp-Nachricht an einen Kunden senden' },
      { label: 'E-Mail senden', prompt: 'Ich möchte eine E-Mail an einen Kunden senden' },
      { label: 'E-Mail mit Anhang', prompt: 'Ich möchte eine E-Mail mit Dateianhang senden' },
      { label: 'Wissensdatenbank verwalten', prompt: 'Ich möchte einen neuen Eintrag zur Wissensdatenbank hinzufügen' },
    ],
  },
  {
    category: 'Einstellungen',
    icon: Settings,
    items: [
      { label: 'Geschäftsprofil', prompt: 'Ich möchte das Geschäftsprofil aktualisieren' },
      { label: 'Buchungsregeln', prompt: 'Ich möchte die Buchungsrichtlinien ändern' },
      { label: 'Öffnungszeiten', prompt: 'Ich möchte die Öffnungszeiten anzeigen oder ändern' },
      { label: 'Tag blockieren', prompt: 'Ich möchte einen bestimmten Tag blockieren' },
    ],
  },
]

export default function VirtualAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const [input, setInput] = useState('')
  const [businessId, setBusinessId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [showMoreActions, setShowMoreActions] = useState(false)
  const [showCapabilities, setShowCapabilities] = useState(false)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Fetch businessId on mount (needed for voice transcription)
  useEffect(() => {
    fetch('/api/businesses/my')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.businesses?.length > 0) {
          setBusinessId(data.businesses[0].business.id)
        }
      })
      .catch(() => {})
  }, [])

  // Handle voice transcription
  const handleTranscription = useCallback((text: string) => {
    setInput(text)
  }, [])

  // Restore conversation on mount
  useEffect(() => {
    const savedId = sessionStorage.getItem(STORAGE_KEY)
    if (!savedId) {
      setIsRestoring(false)
      return
    }

    fetch(`/api/chatbot/conversations/${savedId}`)
      .then(res => {
        if (!res.ok) throw new Error('not found')
        return res.json()
      })
      .then(data => {
        if (data.success && data.messages?.length > 0) {
          // Filter to user/assistant messages only (skip tool/system)
          const chatMessages: Message[] = data.messages
            .filter((m: { role: string; content: string }) =>
              (m.role === 'user' || m.role === 'assistant') && m.content?.trim()
            )
            .map((m: { role: string; content: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }))

          if (chatMessages.length > 0) {
            setMessages(chatMessages)
            setConversationId(savedId)
          }
        }
      })
      .catch(() => {
        sessionStorage.removeItem(STORAGE_KEY)
      })
      .finally(() => {
        setIsRestoring(false)
      })
  }, [])

  // Persist conversationId to sessionStorage
  useEffect(() => {
    if (conversationId) {
      sessionStorage.setItem(STORAGE_KEY, conversationId)
    }
  }, [conversationId])

  const ACCEPTED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/html',
  ]
  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !businessId) return

    // Reset input so the same file can be selected again
    e.target.value = ''

    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert('Nicht unterstütztes Format. Erlaubt: PDF, DOCX, TXT, CSV, XLSX, HTML')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      alert('Datei zu groß. Maximum: 50 MB')
      return
    }

    setUploading(true)
    try {
      // 1. Init upload
      const initRes = await fetch('/api/documents/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          title: file.name,
          filename: file.name,
          contentType: file.type,
          dataClass: 'stored_only',
          audience: 'internal',
        }),
      })

      if (!initRes.ok) {
        throw new Error('Upload-Initialisierung fehlgeschlagen')
      }

      const initData = await initRes.json()

      // 2. Upload to R2
      await fetch(initData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      // 3. Complete upload
      await fetch('/api/documents/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          versionId: initData.versionId,
          fileSize: file.size,
        }),
      })

      // 4. Add to pending files
      setPendingFiles(prev => [...prev, {
        documentId: initData.documentId,
        versionId: initData.versionId,
        r2Key: initData.r2Key,
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      }])
    } catch (err) {
      console.error('[Upload] Error:', err)
      alert('Upload fehlgeschlagen. Bitte versuchen Sie es erneut.')
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (documentId: string) => {
    setPendingFiles(prev => prev.filter(f => f.documentId !== documentId))
  }

  const renderMessageContent = (content: string) => {
    const downloadRegex = /\[DOWNLOAD:(https?:\/\/[^\s|]+)\|([^\]]+)\]/g
    const parts: Array<{ type: 'text'; value: string } | { type: 'download'; url: string; filename: string }> = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = downloadRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: content.slice(lastIndex, match.index) })
      }
      parts.push({ type: 'download', url: match[1], filename: match[2] })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', value: content.slice(lastIndex) })
    }

    if (parts.length === 1 && parts[0].type === 'text') {
      return <p className="whitespace-pre-wrap text-sm">{content}</p>
    }

    return (
      <div className="space-y-2">
        {parts.map((part, i) =>
          part.type === 'text' ? (
            <p key={i} className="whitespace-pre-wrap text-sm">{part.value}</p>
          ) : (
            <a
              key={i}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              download={part.filename}
              className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <Download className="h-4 w-4" />
              {part.filename}
            </a>
          )
        )}
      </div>
    )
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const filesToSend = [...pendingFiles]
    const displayContent = filesToSend.length > 0
      ? `${text.trim()}\n\n${filesToSend.map(f => `[${f.filename}]`).join(' ')}`
      : text.trim()

    const userMessage: Message = { role: 'user', content: displayContent }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setPendingFiles([])
    setIsLoading(true)

    try {
      const res = await fetch('/api/admin/assistant/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          conversationId,
          ...(filesToSend.length > 0 ? { attachedFiles: filesToSend } : {}),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Senden')
      }

      if (data.conversationId) {
        setConversationId(data.conversationId)
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const resetConversation = () => {
    setMessages([])
    setConversationId(null)
    setPendingFiles([])
    sessionStorage.removeItem(STORAGE_KEY)
    setInput('')
    textareaRef.current?.focus()
  }

  if (isRestoring) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Virtual Assistant</h1>
            <p className="text-sm text-muted-foreground">Ihr interner Geschäftsassistent</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={resetConversation}>
          <Plus className="mr-1.5 h-4 w-4" />
          Neues Gespräch
        </Button>
      </div>

      {/* Chat Area */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center overflow-y-auto">
              <Bot className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="mb-6 text-center text-sm text-muted-foreground">
                Wie kann ich Ihnen heute helfen?
              </p>

              {/* Quick Actions */}
              <div className="w-full max-w-lg space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS_PRIMARY.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.prompt)}
                      className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                    >
                      <action.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {action.label}
                    </button>
                  ))}
                  {showMoreActions && QUICK_ACTIONS_MORE.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.prompt)}
                      className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                    >
                      <action.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {action.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowMoreActions(!showMoreActions)}
                  className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${showMoreActions ? 'rotate-180' : ''}`} />
                  {showMoreActions ? 'Weniger anzeigen' : 'Mehr Aktionen'}
                </button>

                {/* Capabilities Panel */}
                <div className="pt-2">
                  <button
                    onClick={() => setShowCapabilities(!showCapabilities)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Lightbulb className="h-4 w-4" />
                    Was kann ich?
                    <ChevronDown className={`h-3 w-3 transition-transform ${showCapabilities ? 'rotate-180' : ''}`} />
                  </button>
                  {showCapabilities && (
                    <div className="mt-3 rounded-lg border bg-background">
                      <Accordion type="multiple" className="w-full">
                        {CAPABILITIES.map((cat) => (
                          <AccordionItem key={cat.category} value={cat.category}>
                            <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
                              <span className="flex items-center gap-2">
                                <cat.icon className="h-4 w-4 text-muted-foreground" />
                                {cat.category}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-3">
                              <div className="flex flex-wrap gap-1.5">
                                {cat.items.map((item) => (
                                  <button
                                    key={item.label}
                                    onClick={() => sendMessage(item.prompt)}
                                    className="rounded-md border bg-muted/50 px-2.5 py-1 text-xs transition-colors hover:bg-primary/10 hover:text-primary"
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.role === 'assistant' ? renderMessageContent(msg.content) : (
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-muted px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-4">
          {/* File chips */}
          {pendingFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {pendingFiles.map(f => (
                <span
                  key={f.documentId}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary"
                >
                  <FileText className="h-3 w-3" />
                  {f.filename}
                  <button
                    onClick={() => removeFile(f.documentId)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht eingeben..."
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
              disabled={isLoading}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || uploading}
              className="h-[44px] w-[44px] shrink-0"
              title="Datei anhängen"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,.csv,.xlsx,.html"
              onChange={handleFileSelect}
            />
            {businessId && (
              <VoiceRecorder
                businessId={businessId}
                onTranscription={handleTranscription}
                disabled={isLoading}
              />
            )}
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[44px] w-[44px] shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
