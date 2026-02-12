'use client'

/**
 * Knowledge Base Tab
 *
 * CRUD interface for managing chatbot knowledge entries
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit, Trash2, Loader2, BookOpen, Calendar, Search, X, ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'sonner'
import { fetchWithRetry, handleError, safeAsync } from '@/lib/errors/error-handler'

interface KnowledgeEntry {
  id: string
  title: string
  content: string
  category: string | null
  source: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface KnowledgeBaseTabProps {
  businessId: string
}

export function KnowledgeBaseTab({ businessId }: KnowledgeBaseTabProps) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
  })
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const categories = [
    { value: 'faq', label: 'FAQs' },
    { value: 'services', label: 'Dienstleistungen' },
    { value: 'policies', label: 'Richtlinien' },
    { value: 'other', label: 'Sonstiges' },
  ]

  const fetchEntries = async () => {
    const data = await safeAsync(
      async () => {
        const response = await fetchWithRetry(
          `/api/chatbot/knowledge?businessId=${businessId}`,
          {},
          {
            maxRetries: 2,
            initialDelay: 500,
          }
        )
        return response.json()
      },
      {
        errorMessage: 'Fehler beim Laden der Wissensdatenbank',
      }
    )

    if (data && data.success) {
      setEntries(data.entries)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchEntries()
  }, [businessId])

  const handleOpenDialog = (entry?: KnowledgeEntry) => {
    if (entry) {
      setEditingEntry(entry)
      setFormData({
        title: entry.title,
        content: entry.content,
        category: entry.category || '',
      })
    } else {
      setEditingEntry(null)
      setFormData({
        title: '',
        content: '',
        category: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingEntry(null)
    setFormData({ title: '', content: '', category: '' })
  }

  const handleSave = async () => {
    // Frontend validation
    if (!formData.title.trim()) {
      toast.error('Bitte geben Sie einen Titel ein')
      return
    }

    if (formData.title.trim().length < 3) {
      toast.error('Titel muss mindestens 3 Zeichen lang sein')
      return
    }

    if (!formData.content.trim()) {
      toast.error('Bitte geben Sie Inhalt ein')
      return
    }

    if (formData.content.trim().length < 50) {
      toast.error('Inhalt muss mindestens 50 Zeichen lang sein')
      return
    }

    setSaving(true)

    try {
      const url = editingEntry
        ? `/api/chatbot/knowledge/${editingEntry.id}`
        : '/api/chatbot/knowledge'

      const method = editingEntry ? 'PATCH' : 'POST'

      const body: Record<string, unknown> = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category || null,
      }

      if (!editingEntry) {
        body.businessId = businessId
        body.source = 'manual'
      }

      const response = await fetchWithRetry(
        url,
        {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        {
          maxRetries: 2,
          initialDelay: 1000,
        }
      )

      const data = await response.json()

      if (data.success) {
        toast.success(
          editingEntry
            ? 'Eintrag erfolgreich aktualisiert'
            : 'Eintrag erfolgreich erstellt'
        )
        await fetchEntries()
        handleCloseDialog()
      } else {
        // Handle validation errors from backend
        if (data.code === 'VALIDATION_ERROR' && data.details) {
          const errorMessages = data.details.map((issue: { message: string }) => issue.message).join(', ')
          toast.error(`Validierungsfehler: ${errorMessages}`)
        } else {
          toast.error(data.error || 'Fehler beim Speichern')
        }
      }
    } catch (error) {
      handleError(
        error,
        editingEntry
          ? 'Fehler beim Aktualisieren des Eintrags'
          : 'Fehler beim Erstellen des Eintrags'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (entry: KnowledgeEntry) => {
    if (!confirm(`Möchten Sie "${entry.title}" wirklich löschen?`)) {
      return
    }

    const data = await safeAsync(
      async () => {
        const response = await fetchWithRetry(
          `/api/chatbot/knowledge/${entry.id}`,
          {
            method: 'DELETE',
          },
          {
            maxRetries: 2,
            initialDelay: 500,
          }
        )

        return response.json()
      },
      {
        errorMessage: 'Fehler beim Löschen des Eintrags',
        successMessage: 'Eintrag erfolgreich gelöscht',
      }
    )

    if (data && data.success) {
      await fetchEntries()
    }
  }

  // Filter entries based on search query
  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery.trim()) return true

    const query = searchQuery.toLowerCase()
    const titleMatch = entry.title.toLowerCase().includes(query)
    const contentMatch = entry.content.toLowerCase().includes(query)
    const categoryMatch = entry.category?.toLowerCase().includes(query)

    return titleMatch || contentMatch || categoryMatch
  })

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Lädt Wissensdatenbank...</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Wissensdatenbank
          </h2>
          <p className="text-sm text-gray-500">
            Verwalten Sie Informationen, die Ihr Chatbot verwenden kann
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Neuer Eintrag
        </Button>
      </div>

      {/* Search Bar */}
      {entries.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Durchsuchen Sie die Wissensdatenbank..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      {searchQuery && (
        <div className="text-sm text-gray-600">
          {filteredEntries.length} {filteredEntries.length === 1 ? 'Eintrag' : 'Einträge'} gefunden
          {filteredEntries.length < entries.length && (
            <span className="text-gray-400"> von {entries.length} gesamt</span>
          )}
        </div>
      )}

      {/* Entries List */}
      {entries.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Noch keine Einträge
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Erstellen Sie Ihren ersten Wissensdatenbank-Eintrag, damit Ihr Chatbot
            Fragen beantworten kann.
          </p>
          <Button className="mt-4" onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Ersten Eintrag erstellen
          </Button>
        </Card>
      ) : filteredEntries.length === 0 ? (
        <Card className="p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Keine passenden Einträge
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Versuchen Sie es mit anderen Suchbegriffen oder löschen Sie die Suche.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setSearchQuery('')}
          >
            <X className="mr-2 h-4 w-4" />
            Suche zurücksetzen
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const isExpanded = expandedId === entry.id
            return (
              <Card key={entry.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {entry.title}
                        </h3>
                        {entry.category && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            {categories.find(c => c.value === entry.category)?.label || entry.category}
                          </span>
                        )}
                      </div>
                      {!isExpanded && (
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {entry.content}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(entry.updatedAt), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </span>
                        <span>Quelle: {entry.source === 'manual' ? 'Manuell' : entry.source}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        title={isExpanded ? 'Einklappen' : 'Ausklappen'}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(entry)}
                        title="Bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry)}
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
                {/* Expandable content */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 px-4 py-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {entry.content}
                    </p>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
            </DialogTitle>
            <DialogDescription>
              Fügen Sie Informationen hinzu, die Ihr Chatbot verwenden kann, um Fragen zu beantworten.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Titel</Label>
                <span className="text-xs text-gray-500">
                  {formData.title.length}/255
                </span>
              </div>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="z.B. Öffnungszeiten"
                maxLength={255}
              />
              {formData.title.length > 0 && formData.title.length < 3 && (
                <p className="text-xs text-red-500">Mindestens 3 Zeichen erforderlich</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategorie (optional)</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie wählen" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">Inhalt</Label>
                <span
                  className={`text-xs ${
                    formData.content.length < 50
                      ? 'text-red-500 font-medium'
                      : 'text-gray-500'
                  }`}
                >
                  {formData.content.length}/50000
                  {formData.content.length < 50 && ` (mind. 50)`}
                </span>
              </div>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="z.B. Wir sind Mo-Fr 8-18 Uhr und Sa 9-13 Uhr geöffnet. Termine können online oder telefonisch vereinbart werden..."
                rows={8}
                maxLength={50000}
              />
              {formData.content.length > 0 && formData.content.length < 50 && (
                <p className="text-xs text-red-500">
                  Noch {50 - formData.content.length} Zeichen bis zum Minimum (50 Zeichen)
                </p>
              )}
              <p className="text-xs text-gray-500">
                Der Inhalt wird automatisch für die semantische Suche indexiert (Embedding-Generierung).
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Speichert...
                </>
              ) : (
                'Speichern'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
