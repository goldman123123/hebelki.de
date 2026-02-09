'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, Loader2, Plus } from 'lucide-react'

interface LieferscheinCardProps {
  bookingId: string
  hasItems: boolean
  hasLieferschein: boolean
}

export function LieferscheinCard({ bookingId, hasItems, hasLieferschein: initialHasLieferschein }: LieferscheinCardProps) {
  const [generating, setGenerating] = useState(false)
  const [hasLieferschein, setHasLieferschein] = useState(initialHasLieferschein)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/lieferschein', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Lieferschein konnte nicht erstellt werden')
        return
      }

      setHasLieferschein(true)
    } catch {
      setError('Lieferschein konnte nicht erstellt werden')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Lieferschein
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasLieferschein ? (
          <>
            <p className="text-sm text-green-700 bg-green-50 rounded-md p-3 border border-green-200">
              Lieferschein wurde erstellt.
            </p>
            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <a
                  href={`/api/lieferschein/${bookingId}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="mr-2 h-4 w-4" />
                  PDF herunterladen
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={generating || !hasItems}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Neu erstellen'
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            {!hasItems ? (
              <p className="text-sm text-gray-500 text-center py-2">
                Fügen Sie zuerst Positionen hinzu, um einen Lieferschein zu erstellen.
              </p>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full"
              >
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Lieferschein erstellen
              </Button>
            )}
          </>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
