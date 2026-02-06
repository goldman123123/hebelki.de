'use client'

/**
 * Settings Tab
 *
 * Customize chatbot behavior, branding, and channels
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Save, ExternalLink, AlertCircle, Bot } from 'lucide-react'

interface Business {
  id: string
  name: string
  slug: string
  type: string | null
  primaryColor?: string | null
  settings?: {
    chatbotEnabled?: boolean
    chatbotInstructions?: string
    chatbotWelcomeMessage?: string
    chatbotColor?: string
  }
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
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (business.settings) {
      setFormData({
        chatbotEnabled: business.settings.chatbotEnabled !== false, // Default to true
        chatbotInstructions: business.settings.chatbotInstructions || '',
        chatbotWelcomeMessage: business.settings.chatbotWelcomeMessage || '',
        chatbotColor: business.settings.chatbotColor || business.primaryColor || '#3B82F6',
      })
    }
  }, [business])

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
                ✓ Änderungen gespeichert
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
