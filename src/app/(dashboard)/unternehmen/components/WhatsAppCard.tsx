'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet,
} from '@/components/ui/field'
import {
  MessageCircle, Pencil, AlertTriangle, CheckCircle,
  Info, XCircle, Copy, Check, Loader2
} from 'lucide-react'
import type { Business } from '../types'

interface WhatsAppCardProps {
  business: Business
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (section: string, data: Record<string, unknown>) => Promise<boolean>
  isSaving: boolean
  onRefresh: () => Promise<void>
}

export function WhatsAppCard({
  business,
  editing,
  onEdit,
  onCancel,
  onSave,
  isSaving,
  onRefresh,
}: WhatsAppCardProps) {
  const [whatsappCopied, setWhatsappCopied] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const [whatsappForm, setWhatsappForm] = useState({
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioWhatsappNumber: '',
    whatsappEnabled: false,
  })

  function resetForm() {
    setWhatsappForm({
      twilioAccountSid: business.settings?.twilioAccountSid || '',
      twilioAuthToken: '',
      twilioWhatsappNumber: business.settings?.twilioWhatsappNumber || '',
      whatsappEnabled: business.settings?.whatsappEnabled || false,
    })
  }

  useEffect(() => {
    resetForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business])

  function copyWebhookUrl() {
    navigator.clipboard.writeText('https://www.hebelki.de/api/whatsapp/webhook')
    setWhatsappCopied(true)
    setTimeout(() => setWhatsappCopied(false), 2000)
  }

  async function testWhatsAppConnection() {
    setTestingConnection(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/whatsapp/test', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setTestResult({ success: true, message: `Verbunden: ${data.accountName} (${data.accountStatus})` })
        await onRefresh()
      } else {
        setTestResult({ success: false, message: data.error || 'Verbindung fehlgeschlagen' })
      }
    } catch {
      setTestResult({ success: false, message: 'Netzwerkfehler' })
    } finally {
      setTestingConnection(false)
    }
  }

  async function handleSave() {
    const data: Record<string, unknown> = {
      whatsappEnabled: whatsappForm.whatsappEnabled,
      twilioAccountSid: whatsappForm.twilioAccountSid,
      twilioWhatsappNumber: whatsappForm.twilioWhatsappNumber,
    }
    if (whatsappForm.twilioAuthToken) {
      data.twilioAuthToken = whatsappForm.twilioAuthToken
    }
    await onSave('whatsapp', data)
  }

  function handleCancel() {
    resetForm()
    setTestResult(null)
    onCancel()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          WhatsApp-Integration
        </CardTitle>
        <CardDescription>Twilio-Zugangsdaten für WhatsApp-Chatbot und Live-Chat</CardDescription>
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
        <div className="grid gap-4 md:grid-cols-3">
          {/* Status */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">Status</FieldLegend>
              <FieldGroup className="gap-4">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel>WhatsApp</FieldLabel>
                    <FieldDescription>Chatbot über WhatsApp erreichbar</FieldDescription>
                  </FieldContent>
                  {editing ? (
                    <Switch
                      checked={whatsappForm.whatsappEnabled}
                      onCheckedChange={(checked) => setWhatsappForm({ ...whatsappForm, whatsappEnabled: checked })}
                    />
                  ) : business.settings?.whatsappEnabled ? (
                    <span className="flex items-center gap-1.5 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Aktiviert
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <XCircle className="h-4 w-4" />
                      Deaktiviert
                    </span>
                  )}
                </Field>

                <Field>
                  <FieldLabel>Verbindung</FieldLabel>
                  {business.settings?.twilioVerifiedAt ? (
                    <p className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Verifiziert
                    </p>
                  ) : business.settings?.hasTwilioAuthToken ? (
                    <p className="flex items-center gap-2 text-amber-600 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Nicht getestet
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-muted-foreground text-sm">
                      <XCircle className="h-4 w-4" />
                      Nicht konfiguriert
                    </p>
                  )}
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>

          {/* Zugangsdaten */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">Zugangsdaten</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>Account SID</FieldLabel>
                  <Input
                    value={editing ? whatsappForm.twilioAccountSid : (business.settings?.twilioAccountSid ? `${business.settings.twilioAccountSid.slice(0, 6)}...${business.settings.twilioAccountSid.slice(-4)}` : '')}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, twilioAccountSid: e.target.value })}
                    readOnly={!editing}
                    placeholder="AC..."
                  />
                </Field>

                <Field>
                  <FieldLabel>Auth Token</FieldLabel>
                  <Input
                    type="password"
                    value={editing ? whatsappForm.twilioAuthToken : (business.settings?.hasTwilioAuthToken ? '••••••••' : '')}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, twilioAuthToken: e.target.value })}
                    readOnly={!editing}
                    placeholder={editing && business.settings?.hasTwilioAuthToken ? 'Leer lassen um beizubehalten' : 'Auth Token'}
                  />
                </Field>

                <Field>
                  <FieldLabel>WhatsApp-Nummer</FieldLabel>
                  <Input
                    value={whatsappForm.twilioWhatsappNumber}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, twilioWhatsappNumber: e.target.value })}
                    readOnly={!editing}
                    placeholder="+4915123456789"
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>

          {/* Webhook */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">Webhook</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>Webhook-URL</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value="https://www.hebelki.de/api/whatsapp/webhook"
                      className="flex-1 text-xs"
                    />
                    <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                      {whatsappCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <FieldDescription>In Twilio-Konsole unter Messaging eintragen</FieldDescription>
                </Field>

                {editing && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                    <p className="text-sm text-blue-700 flex items-center gap-2">
                      <Info className="h-4 w-4 flex-shrink-0" />
                      Webhook-URL in Twilio unter Messaging &rarr; Sandbox Settings eintragen.
                    </p>
                  </div>
                )}

                {editing && business.settings?.hasTwilioAuthToken && (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={testWhatsAppConnection}
                      disabled={testingConnection}
                      className="w-full"
                    >
                      {testingConnection ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Teste Verbindung...
                        </>
                      ) : (
                        'Verbindung testen'
                      )}
                    </Button>
                    {testResult && (
                      <div className={`rounded-md p-3 text-sm ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        <p className="flex items-center gap-2">
                          {testResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          {testResult.message}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </FieldGroup>
            </FieldSet>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
