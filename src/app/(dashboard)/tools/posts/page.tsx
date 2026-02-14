'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Instagram,
  Facebook,
  Linkedin,
  Sparkles,
  Loader2,
  Copy,
  Hash,
  ArrowLeft,
  RefreshCw,
  Star,
  Lightbulb,
  CalendarHeart,
  Users,
  HelpCircle,
  Megaphone,
  Check,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import type { LucideIcon } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────

type PostType =
  | 'service_spotlight'
  | 'tip_educational'
  | 'seasonal_promo'
  | 'team_intro'
  | 'faq_answer'
  | 'general_awareness'

type Platform = 'instagram' | 'facebook' | 'linkedin'

type ViewState = 'configure' | 'generating' | 'result'

interface GeneratedPost {
  caption: string
  hashtags: string[]
  callToAction: string
  featuredServices: { name: string; price: string | null; duration: string }[]
  characterCount: number
}

interface ServiceItem {
  id: string
  name: string
  price: string | null
  durationMinutes: number
  isActive: boolean
}

// ── Config ─────────────────────────────────────────────────────────

const PLATFORMS: { id: Platform; label: string; icon: LucideIcon; color: string }[] = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-500' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'from-blue-600 to-blue-500' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'from-blue-700 to-blue-600' },
]

const POST_TYPE_CONFIG: { id: PostType; labelKey: string; descKey: string; icon: LucideIcon; usesServices: boolean }[] = [
  { id: 'service_spotlight', labelKey: 'serviceSpotlight', descKey: 'serviceSpotlightDesc', icon: Star, usesServices: true },
  { id: 'tip_educational', labelKey: 'tipEducational', descKey: 'tipEducationalDesc', icon: Lightbulb, usesServices: false },
  { id: 'seasonal_promo', labelKey: 'seasonalPromo', descKey: 'seasonalPromoDesc', icon: CalendarHeart, usesServices: true },
  { id: 'team_intro', labelKey: 'teamIntro', descKey: 'teamIntroDesc', icon: Users, usesServices: false },
  { id: 'faq_answer', labelKey: 'faqAnswer', descKey: 'faqAnswerDesc', icon: HelpCircle, usesServices: false },
  { id: 'general_awareness', labelKey: 'generalAwareness', descKey: 'generalAwarenessDesc', icon: Megaphone, usesServices: true },
]

const PLATFORM_LIMITS: Record<Platform, number> = {
  instagram: 2200,
  facebook: 63206,
  linkedin: 3000,
}

// ── Page Component ─────────────────────────────────────────────────

export default function MakePostsPage() {
  const t = useTranslations('dashboard.tools.posts')
  const [view, setView] = useState<ViewState>('configure')
  const [error, setError] = useState<string | null>(null)

  // Config state
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [postType, setPostType] = useState<PostType>('service_spotlight')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [customInstructions, setCustomInstructions] = useState('')
  const [services, setServices] = useState<ServiceItem[]>([])

  // Result state
  const [post, setPost] = useState<GeneratedPost | null>(null)
  const [copied, setCopied] = useState<'text' | 'hashtags' | null>(null)

  // Fetch services on mount
  useEffect(() => {
    fetch('/api/admin/services')
      .then(r => r.json())
      .then(data => {
        if (data.services) {
          setServices(data.services.filter((s: ServiceItem) => s.isActive))
        }
      })
      .catch(() => {})
  }, [])

  const currentPostTypeConfig = POST_TYPE_CONFIG.find(p => p.id === postType)
  const showServiceSelector = currentPostTypeConfig?.usesServices ?? false

  const handleGenerate = async () => {
    setView('generating')
    setError(null)

    try {
      const res = await fetch('/api/admin/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postType,
          platform,
          selectedServiceIds: showServiceSelector ? selectedServiceIds : undefined,
          customInstructions: customInstructions.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')

      setPost(data.post)
      setView('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGenerating'))
      setView('configure')
    }
  }

  const handleCopy = async (type: 'text' | 'hashtags') => {
    if (!post) return

    const text = type === 'text'
      ? `${post.caption}\n\n${post.hashtags.map(h => `#${h}`).join(' ')}\n\n${post.callToAction}`
      : post.hashtags.map(h => `#${h}`).join(' ')

    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleRegenerate = () => {
    handleGenerate()
  }

  const handleBack = () => {
    setView('configure')
    setPost(null)
  }

  const toggleService = (id: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  // ── Generating State ──────────────────────────────────────────

  if (view === 'generating') {
    return (
      <div>
        <Header />
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
          <h3 className="text-lg font-medium">{t('generating')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('generatingFor', { platform: PLATFORMS.find(p => p.id === platform)?.label ?? '' })}
          </p>
        </div>
      </div>
    )
  }

  // ── Result State ──────────────────────────────────────────────

  if (view === 'result' && post) {
    const limit = PLATFORM_LIMITS[platform]
    const isOverLimit = post.characterCount > limit

    return (
      <div>
        <Header />

        {error && <ErrorBanner message={error} />}

        <div className="space-y-6">
          {/* Post Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {(() => {
                  const P = PLATFORMS.find(p => p.id === platform)
                  const Icon = P?.icon ?? FileText
                  return <Icon className="h-5 w-5" />
                })()}
                {PLATFORMS.find(p => p.id === platform)?.label}-Post
              </CardTitle>
              <CardDescription>
                {(() => { const cfg = POST_TYPE_CONFIG.find(p => p.id === postType); return cfg ? t(`types.${cfg.labelKey}`) : '' })()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-white p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.caption}</p>
              </div>

              {/* Call to Action */}
              {post.callToAction && (
                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <p className="text-sm font-medium text-blue-800">{post.callToAction}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hashtags */}
          {post.hashtags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Hash className="h-4 w-4" />
                  Hashtags ({post.hashtags.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {post.hashtags.map(tag => (
                    <Badge key={tag} variant="secondary">#{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Featured Services */}
          {post.featuredServices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('includedServices')}</CardTitle>
                <CardDescription>{t('realData')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {post.featuredServices.map(s => (
                    <div key={s.name} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted-foreground">
                        {s.price || t('priceOnRequest')} &middot; {s.duration}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Character Count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{post.characterCount} {t('characters')}</span>
            <span>&middot;</span>
            <span className={isOverLimit ? 'text-red-500 font-medium' : ''}>
              {isOverLimit ? t('overLimit') : t('underLimit')} {platform}-{t('limit')} ({limit.toLocaleString()})
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => handleCopy('text')} className="gap-2">
              {copied === 'text' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === 'text' ? t('copied') : t('copyText')}
            </Button>
            <Button onClick={() => handleCopy('hashtags')} variant="outline" className="gap-2">
              {copied === 'hashtags' ? <Check className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
              {copied === 'hashtags' ? t('copied') : t('copyHashtags')}
            </Button>
            <Button onClick={handleRegenerate} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {t('regenerate')}
            </Button>
            <Button onClick={handleBack} variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('back')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Configure State (default) ─────────────────────────────────

  return (
    <div>
      <Header />

      {error && <ErrorBanner message={error} />}

      <div className="space-y-8">
        {/* Platform Selector */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('platform')}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {PLATFORMS.map(p => {
              const Icon = p.icon
              const selected = platform === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    selected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-transparent bg-muted/50 hover:border-muted-foreground/20'
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${p.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{p.label}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Post Type Selector */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('postType')}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {POST_TYPE_CONFIG.map(p => {
              const Icon = p.icon
              const selected = postType === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setPostType(p.id)}
                  className={`flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-all ${
                    selected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-transparent bg-muted/50 hover:border-muted-foreground/20'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-sm font-medium">{t(`types.${p.labelKey}`)}</span>
                  <span className="text-xs text-muted-foreground">{t(`types.${p.descKey}`)}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Service Selector (conditional) */}
        {showServiceSelector && services.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('selectServices')}
            </h2>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {services.map(s => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedServiceIds.includes(s.id)}
                        onCheckedChange={() => toggleService(s.id)}
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{s.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {s.price ? `${s.price} EUR` : t('priceOnRequest')} &middot; {s.durationMinutes} Min.
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                {selectedServiceIds.length > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t('selected', { count: selectedServiceIds.length })}
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Custom Instructions */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('customInstructions')}
          </h2>
          <Textarea
            value={customInstructions}
            onChange={e => setCustomInstructions(e.target.value)}
            placeholder={t('customInstructionsPlaceholder')}
            rows={3}
          />
        </section>

        {/* Generate Button */}
        <Button onClick={handleGenerate} size="lg" className="w-full gap-2 sm:w-auto">
          <Sparkles className="h-4 w-4" />
          {t('generatePost')}
        </Button>
      </div>
    </div>
  )
}

// ── Shared Components ──────────────────────────────────────────────

function Header() {
  const t = useTranslations('dashboard.tools.posts')
  return (
    <div className="mb-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <FileText className="h-6 w-6" />
        {t('title')}
      </h1>
      <p className="text-gray-600">
        {t('subtitle')}
      </p>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </div>
  )
}
