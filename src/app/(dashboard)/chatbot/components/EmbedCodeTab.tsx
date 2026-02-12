'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Check, ExternalLink, MessageSquare, Calendar } from 'lucide-react'

interface EmbedCodeTabProps {
  businessSlug: string
  businessName: string
  defaultColor: string
}

export function EmbedCodeTab({ businessSlug, businessName, defaultColor }: EmbedCodeTabProps) {
  const [color, setColor] = useState(defaultColor)
  const [position, setPosition] = useState<'right' | 'left'>('right')
  const [copiedBooking, setCopiedBooking] = useState(false)
  const [copiedChat, setCopiedChat] = useState(false)

  const stripHash = (c: string) => c.replace(/^#/, '')

  const bookingSnippet = `<div data-hebelki-booking data-slug="${businessSlug}" data-color="${color}"></div>
<script src="https://www.hebelki.de/embed/widget.js" async></script>`

  const chatSnippet = `<script src="https://www.hebelki.de/embed/widget.js"
        data-hebelki-chat
        data-slug="${businessSlug}"
        data-color="${color}"${position === 'left' ? '\n        data-position="left"' : ''}
        async></script>`

  const copyToClipboard = async (text: string, type: 'booking' | 'chat') => {
    await navigator.clipboard.writeText(text)
    if (type === 'booking') {
      setCopiedBooking(true)
      setTimeout(() => setCopiedBooking(false), 2000)
    } else {
      setCopiedChat(true)
      setTimeout(() => setCopiedChat(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Color Picker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Widget-Farbe</CardTitle>
          <CardDescription>
            Wählen Sie die Hauptfarbe für Ihre eingebetteten Widgets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-20 cursor-pointer rounded"
            />
            <Input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#3B82F6"
              className="w-32"
            />
            <div
              className="h-10 w-10 rounded-full border"
              style={{ backgroundColor: color }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Booking Widget */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            <div>
              <CardTitle className="text-lg">Buchungskalender einbetten</CardTitle>
              <CardDescription>
                Zeigt den Buchungskalender direkt auf Ihrer Website an
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
              <code>{bookingSnippet}</code>
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute right-2 top-2"
              onClick={() => copyToClipboard(bookingSnippet, 'booking')}
            >
              {copiedBooking ? (
                <><Check className="mr-1 h-3 w-3" /> Kopiert</>
              ) : (
                <><Copy className="mr-1 h-3 w-3" /> Kopieren</>
              )}
            </Button>
          </div>

          {/* Preview mockup */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Vorschau</p>
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="h-8 w-8 rounded-lg"
                  style={{ backgroundColor: `${color}20` }}
                />
                <div>
                  <p className="text-sm font-semibold">{businessName}</p>
                  <p className="text-xs text-gray-500">Termin buchen</p>
                </div>
              </div>
              <div className="space-y-2">
                {['Erstberatung', 'Folgetermin', 'Sporttherapie'].map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="text-sm">{name}</span>
                    <div
                      className="rounded px-3 py-1 text-xs text-white"
                      style={{ backgroundColor: color }}
                    >
                      Wählen
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <a
            href={`/embed/book/${businessSlug}?color=${stripHash(color)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            Vorschau im neuen Tab öffnen <ExternalLink className="h-3 w-3" />
          </a>
        </CardContent>
      </Card>

      {/* Chat Widget */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-gray-600" />
            <div>
              <CardTitle className="text-lg">Chat-Bubble einbetten</CardTitle>
              <CardDescription>
                Fügt eine schwebende Chat-Blase unten auf Ihrer Website hinzu
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Position Toggle */}
          <div>
            <Label className="text-sm font-medium">Position</Label>
            <div className="mt-1 flex gap-2">
              <Button
                variant={position === 'right' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPosition('right')}
              >
                Unten rechts
              </Button>
              <Button
                variant={position === 'left' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPosition('left')}
              >
                Unten links
              </Button>
            </div>
          </div>

          <div className="relative">
            <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
              <code>{chatSnippet}</code>
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute right-2 top-2"
              onClick={() => copyToClipboard(chatSnippet, 'chat')}
            >
              {copiedChat ? (
                <><Check className="mr-1 h-3 w-3" /> Kopiert</>
              ) : (
                <><Copy className="mr-1 h-3 w-3" /> Kopieren</>
              )}
            </Button>
          </div>

          {/* Preview mockup */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Vorschau</p>
            <div className="relative h-48 rounded-lg border bg-white overflow-hidden">
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                Ihre Website
              </div>
              {/* Mock chat bubble */}
              <div
                className="absolute bottom-3 flex h-12 w-12 items-center justify-center rounded-full shadow-lg"
                style={{
                  backgroundColor: color,
                  [position === 'left' ? 'left' : 'right']: '12px',
                }}
              >
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <a
            href={`/embed/chat/${businessSlug}?color=${stripHash(color)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            Chat-Vorschau im neuen Tab öffnen <ExternalLink className="h-3 w-3" />
          </a>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Anleitung</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-gray-600">
          <ol className="space-y-2">
            <li>Kopieren Sie den gewünschten Code-Schnipsel oben.</li>
            <li>Fügen Sie ihn in den HTML-Code Ihrer Website ein — am besten vor dem schließenden <code>&lt;/body&gt;</code> Tag.</li>
            <li>Der Buchungskalender erscheint dort, wo Sie das <code>&lt;div&gt;</code> platzieren. Die Chat-Blase erscheint automatisch als schwebendes Element.</li>
            <li>Sie können beide Widgets gleichzeitig auf derselben Seite verwenden.</li>
          </ol>
          <p className="mt-4 text-xs text-gray-400">
            Das Widget-Script ist ~3KB groß und wird asynchron geladen — es verlangsamt Ihre Website nicht.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
