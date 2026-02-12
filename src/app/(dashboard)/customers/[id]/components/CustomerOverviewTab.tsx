'use client'

/**
 * Customer Overview Tab
 *
 * Shows customer details, recent bookings, and recent conversations
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Calendar,
  MessageSquare,
  Edit2,
  Save,
  X,
  Trash2,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  Bot,
  User as UserIcon,
  UserCheck,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'sonner'

interface Message {
  id: string
  role: string
  content: string
  metadata?: Record<string, unknown> | null
  createdAt: string
}

interface Customer {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  notes: string | null
  source: string | null
  street: string | null
  city: string | null
  postalCode: string | null
  country: string | null
  whatsappOptInStatus: string | null
  customFields: Record<string, unknown>
  createdAt: string | null
}

interface Booking {
  id: string
  startsAt: string
  status: string | null
  serviceName: string | null
  staffName: string | null
}

interface Conversation {
  id: string
  channel: string
  status: string
  lastMessageAt: string
}

interface CustomerOverviewTabProps {
  customer: Customer
  recentBookings: Booking[]
  recentConversations: Conversation[]
  onRefresh: () => void
}

// Status badge configuration
const bookingStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Ausstehend', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  confirmed: { label: 'Bestätigt', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelled: { label: 'Storniert', color: 'bg-red-100 text-red-700', icon: XCircle },
  completed: { label: 'Abgeschlossen', color: 'bg-gray-100 text-gray-700', icon: CheckCircle2 },
  no_show: { label: 'Nicht erschienen', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
}

const conversationStatusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Aktiv', color: 'bg-green-100 text-green-700' },
  escalated: { label: 'Eskaliert', color: 'bg-orange-100 text-orange-700' },
  closed: { label: 'Geschlossen', color: 'bg-gray-100 text-gray-700' },
}

const channelLabels: Record<string, string> = {
  web: 'Web',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
}

const sourceLabels: Record<string, string> = {
  booking: 'Buchung',
  chatbot_escalation: 'Chatbot',
  manual: 'Manuell',
  whatsapp: 'WhatsApp',
}

export function CustomerOverviewTab({
  customer,
  recentBookings,
  recentConversations,
  onRefresh,
}: CustomerOverviewTabProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [conversationMessages, setConversationMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [conversationDialogOpen, setConversationDialogOpen] = useState(false)

  const handleViewConversation = useCallback(async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setConversationDialogOpen(true)
    setLoadingMessages(true)
    try {
      const response = await fetch(`/api/chatbot/conversations/${conversation.id}`)
      const data = await response.json()
      if (data.success) {
        setConversationMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  const [editData, setEditData] = useState({
    name: customer.name || '',
    email: customer.email || '',
    phone: customer.phone || '',
    street: customer.street || '',
    city: customer.city || '',
    postalCode: customer.postalCode || '',
    country: customer.country || '',
    notes: customer.notes || '',
  })

  const handleSave = async () => {
    if (!editData.name.trim()) {
      toast.error('Name ist erforderlich')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editData.name.trim(),
          email: editData.email.trim() || null,
          phone: editData.phone.trim() || null,
          street: editData.street.trim() || null,
          city: editData.city.trim() || null,
          postalCode: editData.postalCode.trim() || null,
          country: editData.country.trim() || null,
          notes: editData.notes.trim() || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Kunde aktualisiert')
        setEditing(false)
        onRefresh()
      } else {
        toast.error(data.error || 'Fehler beim Speichern')
      }
    } catch (error) {
      console.error('Failed to save customer:', error)
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/customers/${customer.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Kunde gelöscht')
        router.push('/customers')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Fehler beim Löschen')
      }
    } catch (error) {
      console.error('Failed to delete customer:', error)
      toast.error('Fehler beim Löschen')
    } finally {
      setDeleting(false)
    }
  }

  const cancelEdit = () => {
    setEditData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      street: customer.street || '',
      city: customer.city || '',
      postalCode: customer.postalCode || '',
      country: customer.country || '',
      notes: customer.notes || '',
    })
    setEditing(false)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left Column - Customer Details */}
      <div className="space-y-6 lg:col-span-2">
        {/* Customer Info Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Kundendetails</h2>
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                    <X className="mr-1 h-4 w-4" />
                    Abbrechen
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-1 h-4 w-4" />
                    )}
                    Speichern
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Edit2 className="mr-1 h-4 w-4" />
                    Bearbeiten
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">E-Mail</label>
                <Input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Telefon</label>
                <Input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* Address fields */}
              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  Adresse
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Straße</label>
                    <Input
                      value={editData.street}
                      onChange={(e) => setEditData({ ...editData, street: e.target.value })}
                      className="mt-1"
                      placeholder="Musterstraße 1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">PLZ</label>
                      <Input
                        value={editData.postalCode}
                        onChange={(e) => setEditData({ ...editData, postalCode: e.target.value })}
                        className="mt-1"
                        placeholder="10115"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Stadt</label>
                      <Input
                        value={editData.city}
                        onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                        className="mt-1"
                        placeholder="Berlin"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Land</label>
                    <Input
                      value={editData.country}
                      onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                      className="mt-1"
                      placeholder="Deutschland"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Notizen</label>
                <Textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  className="mt-1"
                  rows={4}
                  placeholder="Interne Notizen zu diesem Kunden..."
                />
              </div>
            </div>
          ) : (
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-gray-900">{customer.name || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">E-Mail</dt>
                <dd className="mt-1 text-gray-900">{customer.email || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Telefon</dt>
                <dd className="mt-1 text-gray-900">{customer.phone || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Quelle</dt>
                <dd className="mt-1 text-gray-900">
                  {customer.source ? sourceLabels[customer.source] || customer.source : '-'}
                </dd>
              </div>

              {/* Address */}
              {(customer.street || customer.city || customer.postalCode || customer.country) && (
                <div className="pt-3 border-t">
                  <dt className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Adresse
                  </dt>
                  <dd className="mt-1 text-gray-900">
                    {customer.street && <div>{customer.street}</div>}
                    {(customer.postalCode || customer.city) && (
                      <div>{[customer.postalCode, customer.city].filter(Boolean).join(' ')}</div>
                    )}
                    {customer.country && customer.country !== 'Deutschland' && (
                      <div>{customer.country}</div>
                    )}
                  </dd>
                </div>
              )}

              {/* WhatsApp Status */}
              {customer.whatsappOptInStatus && customer.whatsappOptInStatus !== 'UNSET' && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">WhatsApp</dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        customer.whatsappOptInStatus === 'OPTED_IN'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {customer.whatsappOptInStatus === 'OPTED_IN' ? 'Opt-In' : 'Opt-Out'}
                    </span>
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-medium text-gray-500">Erstellt am</dt>
                <dd className="mt-1 text-gray-900">
                  {customer.createdAt
                    ? format(new Date(customer.createdAt), 'PPP', { locale: de })
                    : '-'}
                </dd>
              </div>
              {customer.notes && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Notizen</dt>
                  <dd className="mt-1 text-gray-900 whitespace-pre-wrap">{customer.notes}</dd>
                </div>
              )}
            </dl>
          )}
        </Card>

        {/* Recent Bookings */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Letzte Buchungen
          </h2>
          {recentBookings.length === 0 ? (
            <p className="text-gray-500 text-sm">Keine Buchungen vorhanden</p>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((booking) => {
                const statusConfig = bookingStatusConfig[booking.status || 'pending'] ||
                  bookingStatusConfig.pending
                const StatusIcon = statusConfig.icon

                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/bookings/${booking.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {booking.serviceName || 'Service'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(booking.startsAt), 'PPp', { locale: de })}
                          {booking.staffName && ` • ${booking.staffName}`}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.color}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Right Column - Conversations */}
      <div>
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Letzte Konversationen
          </h2>
          {recentConversations.length === 0 ? (
            <p className="text-gray-500 text-sm">Keine Konversationen vorhanden</p>
          ) : (
            <div className="space-y-3">
              {recentConversations.map((conversation) => {
                const statusConfig = conversationStatusConfig[conversation.status] ||
                  conversationStatusConfig.active

                return (
                  <div
                    key={conversation.id}
                    className="rounded-lg border p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewConversation(conversation)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {channelLabels[conversation.channel] || conversation.channel}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MessageSquare className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kunde löschen</DialogTitle>
            <DialogDescription>
              Möchten Sie &quot;{customer.name}&quot; wirklich löschen? Alle
              zugehörigen Buchungen und Konversationen bleiben erhalten, aber
              die Verknüpfung zu diesem Kunden wird aufgehoben.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Löschen...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Löschen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conversation Detail Dialog */}
      <Dialog open={conversationDialogOpen} onOpenChange={setConversationDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Gesprächsverlauf</DialogTitle>
            <DialogDescription>
              {selectedConversation && (
                <span className="flex items-center gap-2 text-sm">
                  <span>{channelLabels[selectedConversation.channel] || selectedConversation.channel}</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(selectedConversation.lastMessageAt), {
                      addSuffix: true,
                      locale: de,
                    })}
                  </span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[500px] overflow-y-auto py-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Lädt Nachrichten...</span>
              </div>
            ) : conversationMessages.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                Keine Nachrichten in diesem Gespräch
              </div>
            ) : (
              <div className="space-y-4">
                {conversationMessages
                  .filter(m => m.role !== 'tool')
                  .map((message) => {
                    if (message.role === 'system') {
                      return (
                        <div key={message.id} className="text-center">
                          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs italic text-gray-500">
                            {message.content}
                          </span>
                        </div>
                      )
                    }

                    if (message.role === 'staff') {
                      const staffName = (message.metadata?.staffName as string) || 'Support'
                      return (
                        <div key={message.id} className="flex gap-3 justify-end">
                          <div className="text-right">
                            <p className="text-[10px] font-medium text-purple-600 mb-0.5">{staffName}</p>
                            <div className="max-w-[70%] ml-auto rounded-lg bg-purple-50 border border-purple-200 px-4 py-2">
                              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                              <p className="mt-1 text-xs text-gray-500">
                                {new Date(message.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 flex-shrink-0">
                            <UserCheck className="h-5 w-5 text-purple-600" />
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
                            <Bot className="h-5 w-5 text-blue-600" />
                          </div>
                        )}

                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {message.role === 'assistant' && (
                            <p className="text-[10px] font-medium text-blue-500 mb-0.5">KI-Assistent</p>
                          )}
                          <p className="whitespace-pre-wrap text-sm">
                            {message.content}
                          </p>
                          <p
                            className={`mt-1 text-xs ${
                              message.role === 'user'
                                ? 'text-blue-100'
                                : 'text-gray-500'
                            }`}
                          >
                            {new Date(message.createdAt).toLocaleTimeString('de-DE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>

                        {message.role === 'user' && (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 flex-shrink-0">
                            <UserIcon className="h-5 w-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
