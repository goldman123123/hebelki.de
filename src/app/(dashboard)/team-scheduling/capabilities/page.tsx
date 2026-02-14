'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowLeft, Loader2, Shield, ShieldCheck, RotateCcw, Save, Check,
  Users, ChevronRight
} from 'lucide-react'
import Link from 'next/link'

// Tool categories - labels come from translations
const TOOL_CATEGORIES: Record<string, string[]> = {
  bookings: [
    'search_bookings', 'update_booking_status', 'reschedule_booking',
    'get_todays_bookings', 'get_upcoming_bookings', 'create_booking_admin',
    'cancel_booking_with_notification',
  ],
  customers: [
    'create_customer', 'update_customer', 'search_customers',
    'get_customer_bookings', 'delete_customer',
  ],
  communication: [
    'send_email_to_customer', 'resend_booking_confirmation', 'send_whatsapp',
  ],
  services: [
    'create_service', 'update_service', 'delete_service',
  ],
  staffMgmt: [
    'create_staff', 'update_staff', 'delete_staff',
    'assign_staff_to_service', 'remove_staff_from_service',
  ],
  availability: [
    'get_availability_template', 'update_availability_template',
    'block_day', 'block_staff_period',
  ],
  invoices: [
    'search_invoices', 'get_invoice_details', 'create_invoice',
    'send_invoice', 'mark_invoice_paid', 'cancel_invoice_storno',
  ],
  knowledge: [
    'add_knowledge_entry', 'update_knowledge_entry', 'delete_knowledge_entry',
  ],
  overview: [
    'get_daily_summary', 'get_monthly_schedule',
    'get_escalated_conversations', 'search_customer_conversations',
  ],
}

interface StaffMember {
  id: string
  name: string
  email: string | null
  phone: string | null
  title: string | null
  avatarUrl: string | null
  isActive: boolean | null
  capabilities?: { allowedTools?: string[] } | null
}

// --- Staff List View ---
function StaffListView() {
  const t = useTranslations('dashboard.team.capabilities')
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])

  useEffect(() => {
    async function fetchStaff() {
      try {
        const res = await fetch('/api/admin/staff')
        const data = await res.json()
        setStaffMembers(data.staff || [])
      } finally {
        setLoading(false)
      }
    }
    fetchStaff()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/team-scheduling">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>
      </div>

      {staffMembers.length === 0 ? (
        <div className="py-12 text-center">
          <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
          <p className="text-muted-foreground">{t('noMembers')}</p>
          <Link href="/team-scheduling" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            {t('manageTeam')}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {staffMembers.map((member) => {
            const hasCustom = member.capabilities?.allowedTools != null
            return (
              <Card
                key={member.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/team-scheduling/capabilities?staffId=${member.id}`)}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatarUrl || undefined} />
                      <AvatarFallback>
                        {member.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.title || t('employee')}
                        {member.email && ` — ${member.email}`}
                      </p>
                    </div>
                    {!member.isActive && (
                      <Badge variant="outline" className="text-xs">
                        {t('inactive')}
                      </Badge>
                    )}
                    {hasCustom && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        {t('custom')}
                      </Badge>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// --- Tool Editor View ---
function ToolEditorView({ staffId }: { staffId: string }) {
  const t = useTranslations('dashboard.team.capabilities')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [staffName, setStaffName] = useState('')
  const [roleDefaults, setRoleDefaults] = useState<string[]>([])
  const [isCustom, setIsCustom] = useState(false)
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set())

  const fetchCapabilities = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/members/${staffId}/capabilities`)
      const data = await res.json()
      setStaffName(data.name || '')
      setRoleDefaults(data.roleDefaults || [])
      setIsCustom(data.isCustom)

      if (data.isCustom && data.capabilities?.allowedTools) {
        setEnabledTools(new Set(data.capabilities.allowedTools))
      } else {
        setEnabledTools(new Set(data.roleDefaults || []))
      }
    } finally {
      setLoading(false)
    }
  }, [staffId])

  useEffect(() => {
    fetchCapabilities()
  }, [fetchCapabilities])

  function toggleTool(toolName: string) {
    setIsCustom(true)
    setSaved(false)
    const next = new Set(enabledTools)
    if (next.has(toolName)) {
      next.delete(toolName)
    } else {
      next.add(toolName)
    }
    setEnabledTools(next)
  }

  function toggleCategory(categoryTools: string[], enable: boolean) {
    setIsCustom(true)
    setSaved(false)
    const next = new Set(enabledTools)
    for (const tool of categoryTools) {
      if (enable) {
        next.add(tool)
      } else {
        next.delete(tool)
      }
    }
    setEnabledTools(next)
  }

  function resetToDefaults() {
    setEnabledTools(new Set(roleDefaults))
    setIsCustom(false)
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/members/${staffId}/capabilities`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowedTools: isCustom ? Array.from(enabledTools) : null,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/team-scheduling/capabilities">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {staffName ? `${staffName} — ${t('staffPermissions')}` : t('title')}
            </h1>
            <p className="text-gray-600">
              {t('employee')}
              {isCustom && (
                <span className="ml-2 text-amber-600 text-xs font-medium">({t('customized')})</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCustom && (
            <Button variant="outline" size="sm" onClick={resetToDefaults}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              {t('default')}
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="mr-1.5 h-4 w-4" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            {saved ? t('saved') : t('save')}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(TOOL_CATEGORIES).map(([key, tools]) => {
          const categoryEnabled = tools.filter(tl => enabledTools.has(tl)).length
          const allEnabled = categoryEnabled === tools.length

          return (
            <Card key={key}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {allEnabled ? (
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <Shield className="h-4 w-4 text-gray-400" />
                    )}
                    <CardTitle className="text-sm font-semibold">{t(`categories.${key}`)}</CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {categoryEnabled}/{tools.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => toggleCategory(tools, !allEnabled)}
                  >
                    {allEnabled ? t('disableAll') : t('enableAll')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {tools.map(tool => (
                    <div
                      key={tool}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <span className="text-sm">{t(`tools.${tool}`)}</span>
                      <Switch
                        checked={enabledTools.has(tool)}
                        onCheckedChange={() => toggleTool(tool)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// --- Router ---
function CapabilitiesContent() {
  const searchParams = useSearchParams()
  const staffId = searchParams.get('staffId')

  if (!staffId) {
    return <StaffListView />
  }

  return <ToolEditorView staffId={staffId} />
}

export default function CapabilitiesPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <CapabilitiesContent />
    </Suspense>
  )
}
