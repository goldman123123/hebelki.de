'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Brain, Key, BarChart3, Zap, Eye, EyeOff, Save, RotateCcw, Loader2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface AvailableModel {
  id: string
  label: string
  provider: string
  tier: 'premium' | 'standard' | 'budget'
}

interface AISettings {
  chatbotModel: string
  websiteModel: string
  extractionModel: string
  postModel: string
  hasCustomApiKey: boolean
  availableModels: AvailableModel[]
}

interface UsageByChannel {
  channel: string
  tokens: number
  costCents: number
  calls: number
}

interface UsageByModel {
  model: string
  tokens: number
  costCents: number
  calls: number
}

interface UsageData {
  period: string
  totalTokens: number
  totalCostCents: number
  totalCalls: number
  byChannel: UsageByChannel[]
  byModel: UsageByModel[]
}

const CHANNEL_LABELS: Record<string, string> = {
  chatbot: 'Chatbot',
  website_gen: 'Website',
  knowledge_extraction: 'Extraktion',
  post_gen: 'Social Media',
  embedding: 'Embeddings',
}

const TIER_STYLES: Record<string, { label: string; className: string }> = {
  premium: { label: 'Premium', className: 'bg-amber-100 text-amber-800' },
  standard: { label: 'Standard', className: 'bg-blue-100 text-blue-800' },
  budget: { label: 'Budget', className: 'bg-gray-100 text-gray-700' },
}

function formatCost(costCents: number): string {
  return `\u20AC${(costCents / 100).toFixed(2)}`
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return tokens.toString()
}

export default function AISettingsPage() {
  const [settings, setSettings] = useState<AISettings | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [usageLoading, setUsageLoading] = useState(true)

  // Model config state
  const [chatbotModel, setChatbotModel] = useState('')
  const [websiteModel, setWebsiteModel] = useState('')
  const [extractionModel, setExtractionModel] = useState('')
  const [postModel, setPostModel] = useState('')
  const [modelSaving, setModelSaving] = useState(false)
  const [modelSaved, setModelSaved] = useState(false)

  // API key state
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [keySaving, setKeySaving] = useState(false)
  const [keyRemoving, setKeyRemoving] = useState(false)

  // Usage period
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month')

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-settings')
      if (res.ok) {
        const data: AISettings = await res.json()
        setSettings(data)
        setChatbotModel(data.chatbotModel)
        setWebsiteModel(data.websiteModel)
        setExtractionModel(data.extractionModel)
        setPostModel(data.postModel)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUsage = useCallback(async () => {
    setUsageLoading(true)
    try {
      const res = await fetch(`/api/admin/ai-usage?period=${period}`)
      if (res.ok) {
        const data: UsageData = await res.json()
        setUsage(data)
      }
    } finally {
      setUsageLoading(false)
    }
  }, [period])

  useEffect(() => { fetchSettings() }, [fetchSettings])
  useEffect(() => { fetchUsage() }, [fetchUsage])

  async function handleSaveModels() {
    setModelSaving(true)
    setModelSaved(false)
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiChatbotModel: chatbotModel,
          aiWebsiteModel: websiteModel,
          aiExtractionModel: extractionModel,
          aiPostModel: postModel,
        }),
      })
      if (res.ok) {
        setModelSaved(true)
        setTimeout(() => setModelSaved(false), 2000)
      }
    } finally {
      setModelSaving(false)
    }
  }

  async function handleResetModels() {
    setModelSaving(true)
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiChatbotModel: null,
          aiWebsiteModel: null,
          aiExtractionModel: null,
          aiPostModel: null,
        }),
      })
      if (res.ok) {
        await fetchSettings()
      }
    } finally {
      setModelSaving(false)
    }
  }

  async function handleSaveApiKey() {
    if (!apiKey.trim()) return
    setKeySaving(true)
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiApiKey: apiKey }),
      })
      if (res.ok) {
        setApiKey('')
        await fetchSettings()
      }
    } finally {
      setKeySaving(false)
    }
  }

  async function handleRemoveApiKey() {
    setKeyRemoving(true)
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiApiKey: '' }),
      })
      if (res.ok) {
        await fetchSettings()
      }
    } finally {
      setKeyRemoving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">KI-Einstellungen konnten nicht geladen werden.</p>
      </div>
    )
  }

  const models = settings.availableModels

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">KI-Einstellungen</h1>
        <p className="text-gray-600">Modelle, API-Schluessel und Verbrauch verwalten</p>
      </div>

      <div className="space-y-6">
        {/* Card 1: Model Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              KI-Modelle
            </CardTitle>
            <CardDescription>
              Waehlen Sie fuer jeden Kanal das bevorzugte KI-Modell aus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <ModelSelect
                label="Chatbot-Modell"
                value={chatbotModel}
                onChange={setChatbotModel}
                models={models}
              />
              <ModelSelect
                label="Website-Modell"
                value={websiteModel}
                onChange={setWebsiteModel}
                models={models}
              />
              <ModelSelect
                label="Wissensextraktion"
                value={extractionModel}
                onChange={setExtractionModel}
                models={models}
              />
              <ModelSelect
                label="Social Media"
                value={postModel}
                onChange={setPostModel}
                models={models}
              />
            </div>
            <div className="mt-6 flex gap-3">
              <Button onClick={handleSaveModels} disabled={modelSaving}>
                {modelSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : modelSaved ? (
                  <Save className="mr-2 h-4 w-4" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {modelSaved ? 'Gespeichert' : 'Speichern'}
              </Button>
              <Button variant="outline" onClick={handleResetModels} disabled={modelSaving}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Standard wiederherstellen
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: API Key (BYOK) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Eigener API-Schluessel
            </CardTitle>
            <CardDescription>
              Verwenden Sie Ihren eigenen OpenRouter-API-Schluessel, um Kosten direkt ueber OpenRouter zu bezahlen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                {settings.hasCustomApiKey ? (
                  <Badge className="bg-green-100 text-green-800">Eigener Schluessel aktiv</Badge>
                ) : (
                  <Badge variant="secondary">Hebelki-Standard</Badge>
                )}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="sk-or-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button onClick={handleSaveApiKey} disabled={keySaving || !apiKey.trim()}>
                  {keySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>

              {settings.hasCustomApiKey && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveApiKey}
                  disabled={keyRemoving}
                  className="text-red-600 hover:text-red-700"
                >
                  {keyRemoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Entfernen
                </Button>
              )}

              <p className="text-xs text-gray-500">
                API-Schluessel erhalten Sie unter{' '}
                <a
                  href="https://openrouter.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  openrouter.ai
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Usage Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Verbrauch
            </CardTitle>
            <CardDescription>
              Token-Verbrauch und geschaetzte Kosten nach Zeitraum.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Period selector */}
              <div className="flex gap-2">
                {([['day', 'Heute'], ['week', 'Diese Woche'], ['month', 'Dieser Monat']] as const).map(([p, label]) => (
                  <Button
                    key={p}
                    variant={period === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPeriod(p)}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {usageLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : usage ? (
                <>
                  {/* Stats row */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Zap className="h-4 w-4" />
                        Tokens gesamt
                      </div>
                      <p className="mt-1 text-2xl font-bold">{formatTokens(usage.totalTokens)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <BarChart3 className="h-4 w-4" />
                        Geschaetzte Kosten
                      </div>
                      <p className="mt-1 text-2xl font-bold">{formatCost(usage.totalCostCents)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Brain className="h-4 w-4" />
                        API-Aufrufe
                      </div>
                      <p className="mt-1 text-2xl font-bold">{usage.totalCalls}</p>
                    </div>
                  </div>

                  {/* Usage by channel */}
                  {usage.byChannel.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-gray-700">Nach Kanal</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-gray-500">
                              <th className="pb-2 font-medium">Kanal</th>
                              <th className="pb-2 font-medium text-right">Tokens</th>
                              <th className="pb-2 font-medium text-right">Kosten</th>
                              <th className="pb-2 font-medium text-right">Aufrufe</th>
                            </tr>
                          </thead>
                          <tbody>
                            {usage.byChannel.map((row) => (
                              <tr key={row.channel} className="border-b last:border-0">
                                <td className="py-2">{CHANNEL_LABELS[row.channel] || row.channel}</td>
                                <td className="py-2 text-right">{formatTokens(row.tokens)}</td>
                                <td className="py-2 text-right">{formatCost(row.costCents)}</td>
                                <td className="py-2 text-right">{row.calls}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Usage by model */}
                  {usage.byModel.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-gray-700">Nach Modell</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-gray-500">
                              <th className="pb-2 font-medium">Modell</th>
                              <th className="pb-2 font-medium text-right">Tokens</th>
                              <th className="pb-2 font-medium text-right">Kosten</th>
                              <th className="pb-2 font-medium text-right">Aufrufe</th>
                            </tr>
                          </thead>
                          <tbody>
                            {usage.byModel.map((row) => (
                              <tr key={row.model} className="border-b last:border-0">
                                <td className="py-2 font-mono text-xs">{row.model}</td>
                                <td className="py-2 text-right">{formatTokens(row.tokens)}</td>
                                <td className="py-2 text-right">{formatCost(row.costCents)}</td>
                                <td className="py-2 text-right">{row.calls}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="py-4 text-center text-sm text-gray-500">
                  Keine Verbrauchsdaten vorhanden.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ModelSelect({
  label,
  value,
  onChange,
  models,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  models: AvailableModel[]
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Modell waehlen..." />
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => {
            const tierStyle = TIER_STYLES[m.tier] || TIER_STYLES.standard
            return (
              <SelectItem key={m.id} value={m.id}>
                <span className="flex items-center gap-2">
                  {m.label}
                  <span className="text-xs text-gray-400">{m.provider}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${tierStyle.className}`}>
                    {tierStyle.label}
                  </span>
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
