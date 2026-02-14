'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field, FieldLabel,
} from '@/components/ui/field'
import {
  Users, Pencil, Plus, Trash2, RefreshCw, Shield, ShieldCheck, Loader2, Info, Mail, UserPlus
} from 'lucide-react'
import type { Business, TeamPhoneNumberEntry } from '../types'

interface StaffMember {
  id: string
  name: string
  email: string | null
  phone: string | null
  isActive: boolean | null
}

interface TeamPhonesCardProps {
  business: Business
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (section: string, data: Record<string, unknown>) => Promise<boolean>
  isSaving: boolean
  onRefresh: () => Promise<void>
}

interface PhoneFormEntry {
  phone: string
  name: string
  role: 'owner' | 'admin' | 'staff'
  email: string
  clerkUserId?: string
  hasPin: boolean
  isNew: boolean
  resetPin: boolean
}

export function TeamPhonesCard({
  business,
  editing,
  onEdit,
  onCancel,
  onSave,
  isSaving,
  onRefresh,
}: TeamPhonesCardProps) {
  const [entries, setEntries] = useState<PhoneFormEntry[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [staffLoading, setStaffLoading] = useState(false)

  function resetForm() {
    const existing = business.settings?.teamPhoneNumbers || []
    setEntries(existing.map(e => ({
      phone: e.phone,
      name: e.name,
      role: e.role,
      email: e.email || '',
      clerkUserId: e.clerkUserId,
      hasPin: e.hasPin || false,
      isNew: false,
      resetPin: false,
    })))
  }

  useEffect(() => {
    resetForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business])

  // Fetch staff members when entering edit mode
  useEffect(() => {
    if (editing && staffMembers.length === 0) {
      setStaffLoading(true)
      fetch('/api/admin/staff')
        .then(res => res.json())
        .then(data => setStaffMembers(data.staff || []))
        .finally(() => setStaffLoading(false))
    }
  }, [editing, staffMembers.length])

  // Get staff members not yet added
  const availableStaff = staffMembers.filter(s => {
    if (!s.isActive) return false
    // Exclude staff already in the entries list (match by phone or name)
    return !entries.some(e =>
      (s.phone && e.phone && s.phone === e.phone) ||
      (s.name && e.name && s.name === e.name)
    )
  })

  function addFromStaff(staffId: string) {
    const member = staffMembers.find(s => s.id === staffId)
    if (!member) return
    setEntries([...entries, {
      phone: member.phone || '',
      name: member.name,
      role: 'staff',
      email: member.email || '',
      hasPin: false,
      isNew: true,
      resetPin: false,
    }])
  }

  function addManual() {
    setEntries([...entries, {
      phone: '',
      name: '',
      role: 'staff',
      email: '',
      hasPin: false,
      isNew: true,
      resetPin: false,
    }])
  }

  function removeEntry(index: number) {
    setEntries(entries.filter((_, i) => i !== index))
  }

  function updateEntry(index: number, field: keyof PhoneFormEntry, value: string | boolean) {
    const updated = [...entries]
    updated[index] = { ...updated[index], [field]: value }
    setEntries(updated)
  }

  async function handleSave() {
    const result = await onSave('teamPhones', {
      entries: entries.map(e => ({
        phone: e.phone,
        name: e.name,
        role: e.role,
        email: e.email || undefined,
        clerkUserId: e.clerkUserId,
        isNew: e.isNew,
        resetPin: e.resetPin,
      })),
    })

    if (result) {
      await onRefresh()
    }
  }

  function handleCancel() {
    resetForm()
    onCancel()
  }

  const roleLabels: Record<string, string> = {
    owner: 'Inhaber',
    admin: 'Admin',
    staff: 'Mitarbeiter',
  }

  const roleColors: Record<string, string> = {
    owner: 'text-purple-600 bg-purple-50',
    admin: 'text-blue-600 bg-blue-50',
    staff: 'text-gray-600 bg-gray-50',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Team-Zugangsnummern
        </CardTitle>
        <CardDescription>
          Telefonnummern, die per WhatsApp oder Anruf auf den internen Assistenten zugreifen dürfen
        </CardDescription>
        <CardAction>
          {editing ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                Abbrechen
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Speichern
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {/* Info box */}
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-700 flex items-start gap-2">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              Wenn eine hier registrierte Nummer per WhatsApp schreibt oder anruft, wird sie als Teammitglied erkannt
              und erhält Zugang zum internen Geschäftsassistenten (statt dem Kunden-Chatbot). Jedes Mitglied benötigt einen 4-stelligen PIN.
            </span>
          </p>
        </div>

        {entries.length === 0 && !editing && (
          <div className="py-6 text-center text-muted-foreground">
            <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Keine Team-Nummern konfiguriert</p>
            <p className="text-xs mt-1">Klicken Sie auf den Stift, um Nummern hinzuzufügen</p>
          </div>
        )}

        {/* Entries list */}
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div key={index} className="rounded-lg border p-4">
              {editing ? (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-4">
                    <Field>
                      <FieldLabel>Name</FieldLabel>
                      <Input
                        value={entry.name}
                        onChange={(e) => updateEntry(index, 'name', e.target.value)}
                        placeholder="Max Mustermann"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Telefonnummer</FieldLabel>
                      <Input
                        value={entry.phone}
                        onChange={(e) => updateEntry(index, 'phone', e.target.value)}
                        placeholder="+49151..."
                      />
                    </Field>
                    <Field>
                      <FieldLabel>E-Mail (für PIN)</FieldLabel>
                      <Input
                        type="email"
                        value={entry.email}
                        onChange={(e) => updateEntry(index, 'email', e.target.value)}
                        placeholder="name@example.de"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Rolle</FieldLabel>
                      <select
                        value={entry.role}
                        onChange={(e) => updateEntry(index, 'role', e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="owner">Inhaber</option>
                        <option value="admin">Admin</option>
                        <option value="staff">Mitarbeiter</option>
                      </select>
                    </Field>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {entry.hasPin && !entry.isNew ? (
                        <span className="flex items-center gap-1.5 text-sm text-green-600">
                          <ShieldCheck className="h-4 w-4" />
                          PIN gesetzt
                        </span>
                      ) : entry.isNew ? (
                        <span className="flex items-center gap-1.5 text-sm text-amber-600">
                          <Shield className="h-4 w-4" />
                          Neuer PIN wird beim Speichern generiert
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-red-600">
                          <Shield className="h-4 w-4" />
                          Kein PIN
                        </span>
                      )}
                      {!entry.isNew && entry.hasPin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateEntry(index, 'resetPin', !entry.resetPin)}
                          className={entry.resetPin ? 'border-amber-300 bg-amber-50 text-amber-700' : ''}
                        >
                          <RefreshCw className="mr-1.5 h-3 w-3" />
                          {entry.resetPin ? 'PIN-Reset markiert' : 'PIN zurücksetzen'}
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeEntry(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-sm">{entry.name}</p>
                      <p className="text-xs text-muted-foreground">{entry.phone}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[entry.role]}`}>
                      {roleLabels[entry.role]}
                    </span>
                    {entry.email && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {entry.email}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.hasPin ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-600">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        PIN aktiv
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-red-500">
                        <Shield className="h-3.5 w-3.5" />
                        Kein PIN
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add buttons */}
        {editing && (
          <div className="mt-3 space-y-2">
            {/* Staff member dropdown */}
            {staffLoading ? (
              <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Teammitglieder laden...
              </div>
            ) : availableStaff.length > 0 ? (
              <div className="flex gap-2">
                <select
                  id="staff-select"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addFromStaff(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>Teammitglied hinzufügen...</option>
                  {availableStaff.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.phone ? ` (${s.phone})` : ''}{s.email ? ` — ${s.email}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : staffMembers.length > 0 ? (
              <p className="text-xs text-muted-foreground text-center py-1">
                Alle Teammitglieder wurden bereits hinzugefügt
              </p>
            ) : null}

            {/* Manual add fallback */}
            <Button
              variant="outline"
              className="w-full"
              size="sm"
              onClick={addManual}
            >
              <Plus className="mr-2 h-4 w-4" />
              Manuell hinzufügen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
