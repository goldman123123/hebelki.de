'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles } from 'lucide-react'
import { TEMPLATES } from '@/modules/website/lib/templates-config'

interface TemplatePickerProps {
  onSelect: (templateId: string) => void
  generating: boolean
}

export function TemplatePicker({ onSelect, generating }: TemplatePickerProps) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Design-Vorlage wählen</h2>
        <p className="text-sm text-muted-foreground">Wählen Sie ein Design — die KI generiert dann den Inhalt aus Ihren Daten.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {TEMPLATES.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selected === template.id
                ? 'ring-2 ring-primary shadow-md'
                : 'hover:ring-1 hover:ring-muted-foreground/20'
            }`}
            onClick={() => setSelected(template.id)}
          >
            <CardContent className="p-0">
              {/* Color preview strip */}
              <div className="h-24 rounded-t-xl flex overflow-hidden">
                {template.previewColors.map((color, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: color }} />
                ))}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm">{template.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{template.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={!selected || generating}
          onClick={() => selected && onSelect(selected)}
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              KI generiert Inhalte...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Website generieren
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
