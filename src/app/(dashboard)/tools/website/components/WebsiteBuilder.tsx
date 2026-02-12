'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Eye, ExternalLink, Palette, Globe, Loader2, RefreshCw,
  ChevronDown, ChevronRight, Save, Sparkles,
} from 'lucide-react'
import { getTemplateConfig } from '@/modules/website/lib/templates-config'
import type { TemplateId } from '@/lib/db/schema'

interface WebsiteData {
  id: string
  businessId: string
  templateId: string
  sections: Record<string, unknown>
  isPublished: boolean
  publishedAt: string | null
  metaTitle: string | null
  metaDescription: string | null
  lastGeneratedAt: string | null
}

interface BusinessData {
  id: string
  slug: string
  name: string
}

interface WebsiteBuilderProps {
  website: WebsiteData
  business: BusinessData
  onUpdate: (website: WebsiteData) => void
  onSwitchTemplate: () => void
}

type SectionKey = 'hero' | 'about' | 'services' | 'testimonials' | 'howItWorks' | 'team' | 'benefits' | 'faq' | 'contact' | 'bookingCta' | 'footer'

const SECTION_LABELS: Record<SectionKey, string> = {
  hero: 'Hero / Kopfbereich',
  about: 'Über uns',
  services: 'Leistungen',
  testimonials: 'Kundenstimmen',
  howItWorks: 'So funktioniert es',
  team: 'Team',
  benefits: 'Ihre Vorteile',
  faq: 'Häufige Fragen',
  contact: 'Kontakt',
  bookingCta: 'Buchungs-CTA',
  footer: 'Footer',
}

const REGENERATABLE_SECTIONS: SectionKey[] = ['hero', 'about', 'testimonials', 'howItWorks', 'benefits', 'faq', 'bookingCta']

export function WebsiteBuilder({ website, business, onUpdate, onSwitchTemplate }: WebsiteBuilderProps) {
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>(null)
  const [editedSections, setEditedSections] = useState<Record<string, Record<string, unknown>>>({})
  const [showPreview, setShowPreview] = useState(false)

  const templateConfig = getTemplateConfig(website.templateId as TemplateId)
  const siteUrl = `/site/${business.slug}`

  const handlePublishToggle = async () => {
    setPublishing(true)
    try {
      const res = await fetch('/api/admin/website', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !website.isPublished }),
      })
      const data = await res.json()
      if (res.ok) onUpdate(data.website)
    } finally {
      setPublishing(false)
    }
  }

  const handleRegenerate = async (sectionName: string) => {
    setRegenerating(sectionName)
    try {
      const res = await fetch('/api/admin/website/regenerate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionName }),
      })
      const data = await res.json()
      if (res.ok) {
        onUpdate(data.website)
        // Clear any local edits for this section
        setEditedSections(prev => {
          const next = { ...prev }
          delete next[sectionName]
          return next
        })
      }
    } finally {
      setRegenerating(null)
    }
  }

  const handleSaveSection = async (sectionName: string) => {
    const sectionData = editedSections[sectionName]
    if (!sectionData) return

    setSaving(true)
    try {
      const currentSection = (website.sections as Record<string, Record<string, unknown>>)[sectionName]
      const merged = { ...currentSection, ...sectionData }

      const res = await fetch('/api/admin/website', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionName, sectionData: merged }),
      })
      const data = await res.json()
      if (res.ok) {
        onUpdate(data.website)
        setEditedSections(prev => {
          const next = { ...prev }
          delete next[sectionName]
          return next
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const updateField = (section: string, field: string, value: string) => {
    setEditedSections(prev => ({
      ...prev,
      [section]: { ...(prev[section] || {}), [field]: value },
    }))
  }

  const getSectionValue = (section: string, field: string): string => {
    if (editedSections[section]?.[field] !== undefined) {
      return editedSections[section][field] as string
    }
    const sectionData = (website.sections as Record<string, Record<string, unknown>>)[section]
    return (sectionData?.[field] as string) || ''
  }

  const renderSectionEditor = (sectionName: SectionKey) => {
    const sectionData = (website.sections as Record<string, Record<string, unknown>>)[sectionName]
    if (!sectionData) return null

    const textFields = Object.entries(sectionData).filter(
      ([, value]) => typeof value === 'string'
    )

    return (
      <div className="space-y-4 pt-4">
        {textFields.map(([field]) => {
          const value = getSectionValue(sectionName, field)
          const isLong = value.length > 100

          return (
            <div key={field} className="space-y-1">
              <Label className="text-xs text-muted-foreground capitalize">{field}</Label>
              {isLong ? (
                <Textarea
                  value={value}
                  onChange={(e) => updateField(sectionName, field, e.target.value)}
                  rows={4}
                  className="text-sm"
                />
              ) : (
                <Input
                  value={value}
                  onChange={(e) => updateField(sectionName, field, e.target.value)}
                  className="text-sm"
                />
              )}
            </div>
          )
        })}

        <div className="flex items-center gap-2 pt-2">
          {editedSections[sectionName] && (
            <Button size="sm" onClick={() => handleSaveSection(sectionName)} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
              Speichern
            </Button>
          )}
          {REGENERATABLE_SECTIONS.includes(sectionName) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRegenerate(sectionName)}
              disabled={regenerating === sectionName}
            >
              {regenerating === sectionName ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              Neu generieren
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Badge variant={website.isPublished ? 'default' : 'secondary'}>
                  {website.isPublished ? 'Veröffentlicht' : 'Entwurf'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Template: <strong>{templateConfig.name}</strong>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {website.isPublished && (
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {siteUrl}
                </a>
              )}
              <div className="flex items-center gap-2">
                <Switch
                  checked={website.isPublished}
                  onCheckedChange={handlePublishToggle}
                  disabled={publishing}
                />
                <Label className="text-sm">
                  {publishing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Veröffentlichen'}
                </Label>
              </div>
              <Button variant="outline" size="sm" onClick={onSwitchTemplate}>
                <Palette className="mr-1 h-3 w-3" />
                Template wechseln
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                <Eye className="mr-1 h-3 w-3" />
                {showPreview ? 'Editor' : 'Vorschau'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showPreview ? (
        /* Preview iframe */
        <Card>
          <CardContent className="p-0">
            <iframe
              src={`${siteUrl}?preview=true`}
              className="w-full border-0 rounded-xl"
              style={{ height: '80vh' }}
              title="Website-Vorschau"
            />
          </CardContent>
        </Card>
      ) : (
        /* Section editors */
        <div className="space-y-2">
          {(Object.keys(SECTION_LABELS) as SectionKey[]).map((sectionName) => {
            const isExpanded = expandedSection === sectionName
            const hasEdits = !!editedSections[sectionName]

            return (
              <Card key={sectionName}>
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedSection(isExpanded ? null : sectionName)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium text-sm">{SECTION_LABELS[sectionName]}</span>
                    {hasEdits && <Badge variant="outline" className="text-xs">Ungespeichert</Badge>}
                  </div>
                </div>
                {isExpanded && (
                  <CardContent className="pt-0 pb-4 px-4">
                    {renderSectionEditor(sectionName)}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Meta info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4" />
            SEO & Meta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Seitentitel</Label>
            <Input
              value={getSectionValue('_meta', 'metaTitle') || website.metaTitle || ''}
              onChange={(e) => updateField('_meta', 'metaTitle', e.target.value)}
              placeholder="Seitentitel für Suchmaschinen"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            <Textarea
              value={getSectionValue('_meta', 'metaDescription') || website.metaDescription || ''}
              onChange={(e) => updateField('_meta', 'metaDescription', e.target.value)}
              placeholder="Beschreibung für Suchmaschinen (150-160 Zeichen)"
              rows={2}
              className="text-sm"
            />
          </div>
          {editedSections['_meta'] && (
            <Button
              size="sm"
              onClick={async () => {
                setSaving(true)
                try {
                  const res = await fetch('/api/admin/website', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      metaTitle: editedSections['_meta']?.metaTitle || website.metaTitle,
                      metaDescription: editedSections['_meta']?.metaDescription || website.metaDescription,
                    }),
                  })
                  const data = await res.json()
                  if (res.ok) {
                    onUpdate(data.website)
                    setEditedSections(prev => {
                      const next = { ...prev }
                      delete next['_meta']
                      return next
                    })
                  }
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
              Meta speichern
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
