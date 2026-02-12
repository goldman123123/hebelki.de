'use client'

/**
 * Settings Tab
 *
 * Customize chatbot behavior, branding, channels, smart routing, and WhatsApp handoff
 */

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Save, ExternalLink, AlertCircle, Bot, Headphones, MessageSquare, Phone } from 'lucide-react'

interface Business {
  id: string
  name: string
  slug: string
  type: string | null
  primaryColor?: string | null
  settings?: Record<string, unknown>
}

interface SettingsTabProps {
  business: Business
}

export function SettingsTab({ business }: SettingsTabProps) {
  const [formData, setFormData] = useState({
    chatbotEnabled: true,
    chatbotInstructions: '',
    chatbotWelcomeMessage: '',
    chatbotColor: business.primaryColor || '#3B82F6',
    liveChatEnabled: false,
    chatDefaultMode: 'ai' as 'ai' | 'live',
    liveChatTimeoutMinutes: 5,
    whatsappHandoffEnabled: false,
    whatsappRoutingMode: 'owner' as 'owner' | 'live',
    ownerWhatsappNumber: '',
    ownerHandoffTimeoutSeconds: 120,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [staffOnline, setStaffOnline] = useState<number | null>(null)

  useEffect(() => {
    const s = business.settings || {}
    setFormData({
      chatbotEnabled: s.chatbotEnabled !== false,
      chatbotInstructions: (s.chatbotInstructions as string) || '',
      chatbotWelcomeMessage: (s.chatbotWelcomeMessage as string) || '',
      chatbotColor: (s.chatbotColor as string) || business.primaryColor || '#3B82F6',
      liveChatEnabled: (s.liveChatEnabled as boolean) || false,
      chatDefaultMode: (s.chatDefaultMode as 'ai' | 'live') || 'ai',
      liveChatTimeoutMinutes: (s.liveChatTimeoutMinutes as number) || 5,
      whatsappHandoffEnabled: (s.whatsappHandoffEnabled as boolean) || false,
      whatsappRoutingMode: (s.whatsappRoutingMode as 'owner' | 'live') || 'owner',
      ownerWhatsappNumber: (s.ownerWhatsappNumber as string) || '',
      ownerHandoffTimeoutSeconds: (s.ownerHandoffTimeoutSeconds as number) || 120,
    })
  }, [business])

  // Poll staff online status every 10 seconds when live chat is enabled
  const fetchStaffStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/chatbot/support/status')
      if (res.ok) {
        const data = await res.json()
        setStaffOnline(data.staffOnline ?? 0)
      }
    } catch {
      // Ignore errors silently
    }
  }, [])

  useEffect(() => {
    if (!formData.liveChatEnabled) {
      setStaffOnline(null)
      return
    }

    fetchStaffStatus()
    const interval = setInterval(fetchStaffStatus, 10_000)
    return () => clearInterval(interval)
  }, [formData.liveChatEnabled, fetchStaffStatus])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    try {
      const response = await fetch(`/api/businesses/${business.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...business.settings,
            chatbotEnabled: formData.chatbotEnabled,
            chatbotInstructions: formData.chatbotInstructions,
            chatbotWelcomeMessage: formData.chatbotWelcomeMessage,
            chatbotColor: formData.chatbotColor,
            liveChatEnabled: formData.liveChatEnabled,
            chatDefaultMode: formData.chatDefaultMode,
            liveChatTimeoutMinutes: formData.liveChatTimeoutMinutes,
            whatsappHandoffEnabled: formData.whatsappHandoffEnabled,
            whatsappRoutingMode: formData.whatsappRoutingMode,
            ownerWhatsappNumber: formData.ownerWhatsappNumber,
            ownerHandoffTimeoutSeconds: formData.ownerHandoffTimeoutSeconds,
          },
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        alert(`Fehler: ${data.error}`)
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const chatUrl = `${window.location.origin}/${business.slug}/chat`
  const whatsappEnabled = (business.settings?.whatsappEnabled as boolean) || false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Chatbot Einstellungen
        </h2>
        <p className="text-sm text-gray-500">
          Passen Sie das Verhalten und Aussehen Ihres Chatbots an
        </p>
      </div>

      {/* Public Chat Link */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-medium text-blue-900">
              Öffentliche Chat-URL
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              Teilen Sie diesen Link mit Ihren Kunden
            </p>
            <code className="mt-2 inline-block rounded bg-blue-100 px-2 py-1 text-sm text-blue-900">
              {chatUrl}
            </code>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(chatUrl, '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Öffnen
          </Button>
        </div>
      </Card>

      {/* Enable/Disable Chatbot */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-gray-700" />
              <Label htmlFor="chatbot-enabled" className="text-base font-semibold cursor-pointer">
                KI-Chatbot aktivieren
              </Label>
            </div>
            <p className="text-sm text-gray-500">
              Wenn deaktiviert, wird der AI-Assistent nicht auf Kundennachrichten antworten.
              Nachrichten werden weiterhin gespeichert.
            </p>
          </div>
          <Switch
            id="chatbot-enabled"
            checked={formData.chatbotEnabled}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, chatbotEnabled: checked })
            }
          />
        </div>

        {/* Warning when disabled */}
        {!formData.chatbotEnabled && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Chatbot ist deaktiviert</AlertTitle>
            <AlertDescription>
              Kunden können weiterhin Nachrichten senden, aber der KI-Assistent wird nicht antworten.
              Aktivieren Sie den Chatbot, um automatische Antworten zu ermöglichen.
            </AlertDescription>
          </Alert>
        )}
      </Card>

      {/* Live Chat Settings */}
      <Card className="p-6">
        <div className="space-y-6">
          {/* a) Allgemein */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-gray-700" />
                <Label htmlFor="live-chat-enabled" className="text-base font-semibold cursor-pointer">
                  Live-Chat aktivieren
                </Label>
              </div>
              <p className="text-sm text-gray-500">
                Ermöglicht es Mitarbeitern, direkt mit Kunden im Chat zu sprechen.
              </p>
            </div>
            <Switch
              id="live-chat-enabled"
              checked={formData.liveChatEnabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, liveChatEnabled: checked })
              }
            />
          </div>

          {formData.liveChatEnabled && (
            <div className="space-y-6 border-t pt-4">
              {/* Default Mode */}
              <div className="space-y-2">
                <Label htmlFor="chat-default-mode">Standard-Modus</Label>
                <Select
                  value={formData.chatDefaultMode}
                  onValueChange={(value: 'ai' | 'live') =>
                    setFormData({ ...formData, chatDefaultMode: value })
                  }
                >
                  <SelectTrigger id="chat-default-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai">KI-Assistent</SelectItem>
                    <SelectItem value="live">Mitarbeiter-zuerst</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {formData.chatDefaultMode === 'ai'
                    ? 'Kunden chatten zuerst mit dem KI-Assistenten und können zu einem Mitarbeiter wechseln.'
                    : 'Kundennachrichten gehen direkt an Mitarbeiter. Wenn kein Mitarbeiter online ist, antwortet der KI-Assistent.'}
                </p>
              </div>

              {/* Timeout */}
              <div className="space-y-2">
                <Label htmlFor="live-chat-timeout">Wartezeit (Minuten)</Label>
                <Input
                  id="live-chat-timeout"
                  type="number"
                  min={1}
                  max={60}
                  value={formData.liveChatTimeoutMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      liveChatTimeoutMinutes: Math.max(1, Math.min(60, parseInt(e.target.value) || 5)),
                    })
                  }
                  className="w-32"
                />
                <p className="text-xs text-gray-500">
                  Maximale Wartezeit, bevor der Kunde per E-Mail benachrichtigt wird
                </p>
              </div>

              {/* b) Smart-Routing */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-5 w-5 text-gray-700" />
                  <h4 className="font-semibold text-gray-900">Smart-Routing</h4>
                </div>

                {/* Staff online indicator */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className={`h-3 w-3 rounded-full ${
                    staffOnline === null ? 'bg-gray-300' :
                    staffOnline > 0 ? 'bg-green-500' : 'bg-red-400'
                  }`} />
                  <span className="text-sm text-gray-700">
                    {staffOnline === null
                      ? 'Status wird geladen...'
                      : staffOnline > 0
                        ? `${staffOnline} Mitarbeiter online`
                        : 'Kein Mitarbeiter online'}
                  </span>
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Wenn kein Mitarbeiter online ist, antwortet automatisch der KI-Assistent.
                  Mitarbeiter gelten als online, wenn sie das Support-Dashboard geöffnet haben.
                </p>
              </div>

              {/* c) WhatsApp-Weiterleitung (only when WhatsApp is configured) */}
              {whatsappEnabled && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-gray-700" />
                      <h4 className="font-semibold text-gray-900">WhatsApp-Weiterleitung</h4>
                    </div>
                    <Switch
                      id="whatsapp-handoff-enabled"
                      checked={formData.whatsappHandoffEnabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, whatsappHandoffEnabled: checked })
                      }
                    />
                  </div>

                  {formData.whatsappHandoffEnabled && (
                    <div className="space-y-4 pl-1">
                      {/* Routing mode */}
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp-routing-mode">Routing-Modus</Label>
                        <Select
                          value={formData.whatsappRoutingMode}
                          onValueChange={(value: 'owner' | 'live') =>
                            setFormData({ ...formData, whatsappRoutingMode: value })
                          }
                        >
                          <SelectTrigger id="whatsapp-routing-mode">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">An Inhaber weiterleiten</SelectItem>
                            <SelectItem value="live">Live-Chat (Mitarbeiter-Dashboard)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Owner WhatsApp number (only when mode is 'owner') */}
                      {formData.whatsappRoutingMode === 'owner' && (
                        <div className="space-y-2">
                          <Label htmlFor="owner-whatsapp-number">Inhaber WhatsApp-Nummer</Label>
                          <Input
                            id="owner-whatsapp-number"
                            type="tel"
                            value={formData.ownerWhatsappNumber}
                            onChange={(e) =>
                              setFormData({ ...formData, ownerWhatsappNumber: e.target.value })
                            }
                            placeholder="+49151..."
                            className="max-w-xs"
                          />
                          <p className="text-xs text-gray-500">
                            E.164-Format (z.B. +4915123456789)
                          </p>
                        </div>
                      )}

                      {/* Handoff timeout */}
                      <div className="space-y-2">
                        <Label htmlFor="handoff-timeout">Wartezeit (Sekunden)</Label>
                        <Input
                          id="handoff-timeout"
                          type="number"
                          min={30}
                          max={600}
                          value={formData.ownerHandoffTimeoutSeconds}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              ownerHandoffTimeoutSeconds: Math.max(30, Math.min(600, parseInt(e.target.value) || 120)),
                            })
                          }
                          className="w-32"
                        />
                        <p className="text-xs text-gray-500">
                          Nach Ablauf dieser Zeit übernimmt der KI-Assistent
                        </p>
                      </div>

                      <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                        Kundennachrichten werden an Ihre WhatsApp-Nummer weitergeleitet.
                        Antworten Sie direkt oder senden Sie &quot;KI&quot; um den Assistenten zu aktivieren.
                        Nach Ablauf der Wartezeit übernimmt der KI-Assistent.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Settings Form */}
      <Card className="p-6">
        <div className="space-y-6">
          {/* Custom Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">
              Benutzerdefinierte Anweisungen
            </Label>
            <Textarea
              id="instructions"
              value={formData.chatbotInstructions}
              onChange={(e) => setFormData({ ...formData, chatbotInstructions: e.target.value })}
              placeholder="z.B. Betone immer unsere Spezialisierung auf Sportphysiotherapie..."
              rows={4}
            />
            <p className="text-xs text-gray-500">
              Diese Anweisungen werden dem Chatbot als zusätzliche Richtlinien gegeben
            </p>
          </div>

          {/* Welcome Message */}
          <div className="space-y-2">
            <Label htmlFor="welcome">
              Willkommensnachricht
            </Label>
            <Textarea
              id="welcome"
              value={formData.chatbotWelcomeMessage}
              onChange={(e) => setFormData({ ...formData, chatbotWelcomeMessage: e.target.value })}
              placeholder={`Hallo und herzlich willkommen bei ${business.name}! Wie kann ich Ihnen helfen?`}
              rows={3}
            />
            <p className="text-xs text-gray-500">
              Diese Nachricht wird angezeigt, wenn Kunden den Chat öffnen
            </p>
          </div>

          {/* Chatbot Color */}
          <div className="space-y-2">
            <Label htmlFor="color">
              Chat-Widget Farbe
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="color"
                type="color"
                value={formData.chatbotColor}
                onChange={(e) => setFormData({ ...formData, chatbotColor: e.target.value })}
                className="h-10 w-20 cursor-pointer"
              />
              <Input
                type="text"
                value={formData.chatbotColor}
                onChange={(e) => setFormData({ ...formData, chatbotColor: e.target.value })}
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-gray-500">
              Diese Farbe wird für Buttons und Akzente im Chat verwendet
            </p>
          </div>

          {/* Preview */}
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-6">
            <h4 className="mb-3 text-sm font-medium text-gray-700">Vorschau</h4>
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3 border-b pb-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${formData.chatbotColor}20` }}
                >
                  <svg
                    className="h-6 w-6"
                    style={{ color: formData.chatbotColor }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <div>
                  <h5 className="font-medium" style={{ color: formData.chatbotColor }}>
                    {business.name}
                  </h5>
                  <p className="text-xs text-gray-500">Online</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="rounded-lg bg-gray-100 p-3 text-sm">
                  {formData.chatbotWelcomeMessage || `Hallo und herzlich willkommen bei ${business.name}! Wie kann ich Ihnen helfen?`}
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between border-t pt-4">
            {saved && (
              <span className="text-sm text-green-600">
                Änderungen gespeichert
              </span>
            )}
            <div className="ml-auto">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Speichert...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Änderungen speichern
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
