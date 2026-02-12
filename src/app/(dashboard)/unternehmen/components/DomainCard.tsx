'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet,
} from '@/components/ui/field'
import {
  Globe, CheckCircle, XCircle, AlertTriangle,
  Copy, Check, Loader2, Trash2, ExternalLink
} from 'lucide-react'
import type { Business } from '../types'

interface DomainCardProps {
  business: Business
  onRefresh: () => Promise<void>
}

interface VerificationResult {
  domain: string
  verified: boolean
  misconfigured: boolean
  verification: Array<{ type: string; domain: string; value: string }> | null
}

export function DomainCard({ business, onRefresh }: DomainCardProps) {
  const [domainInput, setDomainInput] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null)
  const [copied, setCopied] = useState(false)

  const hasCustomDomainFeature = business.planId === 'pro' || business.planId === 'business'
  const bookingUrl = `https://www.hebelki.de/book/${business.slug}`
  const subdomainUrl = `${business.slug}.hebelki.de`

  async function handleAddDomain() {
    if (!domainInput.trim()) return
    setIsAdding(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/domains/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput.trim().toLowerCase() }),
      })
      const data = await res.json()

      if (!res.ok) {
        const errMsg = typeof data.error === 'string' ? data.error : 'Fehler beim Hinzufuegen der Domain'
        setError(errMsg)
        return
      }

      setDomainInput('')
      await onRefresh()

      // Auto-verify after adding
      await handleVerify()
    } catch {
      setError('Netzwerkfehler')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleVerify() {
    setIsVerifying(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/domains/verify', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        const errMsg = typeof data.error === 'string' ? data.error : 'Fehler bei der Verifizierung'
        setError(errMsg)
        return
      }

      setVerifyResult(data)
    } catch {
      setError('Netzwerkfehler')
    } finally {
      setIsVerifying(false)
    }
  }

  async function handleRemove() {
    if (!confirm('Domain wirklich entfernen? Die DNS-Einstellungen muessen manuell geaendert werden.')) return
    setIsRemoving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/domains/remove', { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) {
        const errMsg = typeof data.error === 'string' ? data.error : 'Fehler beim Entfernen der Domain'
        setError(errMsg)
        return
      }

      setVerifyResult(null)
      await onRefresh()
    } catch {
      setError('Netzwerkfehler')
    } finally {
      setIsRemoving(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Domain & Buchungs-URL
        </CardTitle>
        <CardDescription>Buchungsseite und benutzerdefinierte Domain verwalten</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Buchungs-URLs */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">Buchungs-URLs</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>Standard-URL</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={bookingUrl}
                      className="flex-1 text-xs"
                    />
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(bookingUrl)}>
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </Field>

                <Field>
                  <FieldLabel>Subdomain</FieldLabel>
                  <FieldDescription>Automatisch erstellt</FieldDescription>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span className="font-mono text-muted-foreground">{subdomainUrl}</span>
                    <Badge variant="outline" className="text-xs">Automatisch</Badge>
                  </div>
                </Field>

                {business.customDomain && (
                  <Field>
                    <FieldLabel>Benutzerdefinierte Domain</FieldLabel>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <a
                        href={`https://${business.customDomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-blue-600 hover:underline"
                      >
                        {business.customDomain}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      {verifyResult?.verified ? (
                        <Badge className="bg-green-500 text-white text-xs">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Verifiziert
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 text-xs">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          DNS ausstehend
                        </Badge>
                      )}
                    </div>
                  </Field>
                )}
              </FieldGroup>
            </FieldSet>
          </div>

          {/* Benutzerdefinierte Domain */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1 flex items-center gap-2">
                Benutzerdefinierte Domain
                {!hasCustomDomainFeature && (
                  <Badge className="bg-purple-500 text-white text-xs">Pro+</Badge>
                )}
              </FieldLegend>
              <FieldGroup className="gap-4">
                {!hasCustomDomainFeature ? (
                  <div className="rounded-md border border-purple-200 bg-purple-50 p-3">
                    <p className="text-sm text-purple-700">
                      Benutzerdefinierte Domains sind ab dem Pro-Tarif verfuegbar.
                      Upgraden Sie, um Ihre eigene Domain zu verwenden.
                    </p>
                  </div>
                ) : business.customDomain ? (
                  <>
                    <Field>
                      <FieldLabel>Aktuelle Domain</FieldLabel>
                      <p className="font-mono text-sm">{business.customDomain}</p>
                    </Field>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleVerify}
                        disabled={isVerifying}
                        className="flex-1"
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Pruefe...
                          </>
                        ) : (
                          'DNS pruefen'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemove}
                        disabled={isRemoving}
                        className="text-red-600 hover:text-red-700"
                      >
                        {isRemoving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Field>
                      <FieldLabel>Domain hinzufuegen</FieldLabel>
                      <FieldDescription>z.B. termine.meinbetrieb.de</FieldDescription>
                      <div className="mt-1 flex items-center gap-2">
                        <Input
                          value={domainInput}
                          onChange={(e) => setDomainInput(e.target.value)}
                          placeholder="termine.meinbetrieb.de"
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={handleAddDomain}
                          disabled={isAdding || !domainInput.trim()}
                        >
                          {isAdding ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Hinzufuegen'
                          )}
                        </Button>
                      </div>
                    </Field>
                  </>
                )}
              </FieldGroup>
            </FieldSet>
          </div>

          {/* DNS-Anleitung */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">DNS-Einrichtung</FieldLegend>
              <FieldGroup className="gap-4">
                {business.customDomain ? (
                  <>
                    <Field>
                      <FieldLabel>DNS-Eintrag erstellen</FieldLabel>
                      <FieldDescription>
                        Bei Ihrem DNS-Anbieter folgenden CNAME-Eintrag erstellen:
                      </FieldDescription>
                      <div className="mt-2 space-y-2">
                        <div className="rounded-md bg-muted p-3 font-mono text-xs space-y-1">
                          <p><span className="text-muted-foreground">Typ:</span> CNAME</p>
                          <p><span className="text-muted-foreground">Name:</span> {business.customDomain.split('.')[0]}</p>
                          <p><span className="text-muted-foreground">Ziel:</span> cname.vercel-dns.com</p>
                        </div>
                      </div>
                    </Field>

                    {verifyResult && !verifyResult.verified && verifyResult.verification && (
                      <Field>
                        <FieldLabel>Zusaetzliche Verifizierung</FieldLabel>
                        <FieldDescription>
                          Folgenden TXT-Eintrag hinzufuegen:
                        </FieldDescription>
                        {verifyResult.verification.map((v, i) => (
                          <div key={i} className="mt-2 rounded-md bg-muted p-3 font-mono text-xs space-y-1">
                            <p><span className="text-muted-foreground">Typ:</span> {v.type}</p>
                            <p><span className="text-muted-foreground">Name:</span> {v.domain}</p>
                            <p className="break-all"><span className="text-muted-foreground">Wert:</span> {v.value}</p>
                          </div>
                        ))}
                      </Field>
                    )}

                    {verifyResult?.verified && (
                      <div className="rounded-md bg-green-50 p-3">
                        <p className="flex items-center gap-2 text-sm text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          Domain erfolgreich verifiziert und aktiv.
                        </p>
                      </div>
                    )}

                    {verifyResult && !verifyResult.verified && (
                      <div className="rounded-md bg-amber-50 p-3">
                        <p className="flex items-center gap-2 text-sm text-amber-700">
                          <AlertTriangle className="h-4 w-4" />
                          DNS-Aenderungen koennen bis zu 48 Stunden dauern.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <p>
                      Um eine benutzerdefinierte Domain zu verwenden, erstellen Sie einen
                      CNAME-Eintrag bei Ihrem DNS-Anbieter, der auf{' '}
                      <span className="font-mono">cname.vercel-dns.com</span> zeigt.
                    </p>
                    <p className="mt-2">
                      DNS-Aenderungen koennen bis zu 48 Stunden dauern.
                    </p>
                  </div>
                )}
              </FieldGroup>
            </FieldSet>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3">
            <p className="flex items-center gap-2 text-sm text-red-700">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
