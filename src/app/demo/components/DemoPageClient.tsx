'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Heart,
  Wrench,
  Scissors,
  Activity,
  Dumbbell,
  Building2,
  Bot,
  Sparkles,
  MessageSquare,
  Phone,
  Shield,
  BookOpen,
  CalendarCheck,
  Radio,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ChatInterface } from '@/modules/chatbot/components/ChatInterface'
import { DemoAssistantChat } from './DemoAssistantChat'
import { PhoneCallModal } from './PhoneCallModal'

interface DemoBusiness {
  id: string
  name: string
  slug: string
  type: string
  primaryColor: string | null
  description: string | null
  settings: Record<string, unknown> | null
}

const BUSINESS_META: Record<string, {
  icon: typeof Heart
  typeLabel: string
  shortDescription: string
}> = {
  'demo-vet': {
    icon: Heart,
    typeLabel: 'Tierarztpraxis',
    shortDescription: 'Terminbuchung, Impferinnerungen und Beratung rund um Ihr Haustier.',
  },
  'demo-mechanic': {
    icon: Wrench,
    typeLabel: 'KFZ-Werkstatt',
    shortDescription: 'Werkstatttermine, Kostenvoranschläge und Reparaturstatus.',
  },
  'demo-salon': {
    icon: Scissors,
    typeLabel: 'Friseursalon',
    shortDescription: 'Haarschnitt, Färbung und Styling — online buchen.',
  },
  'demo-physio': {
    icon: Activity,
    typeLabel: 'Physiotherapie',
    shortDescription: 'Behandlungstermine, Rezeptverwaltung und Therapieplanung.',
  },
  'demo-fitness': {
    icon: Dumbbell,
    typeLabel: 'Fitness-Studio',
    shortDescription: 'Kursbuchung, Trainingsplan und Mitgliederverwaltung.',
  },
}

export function DemoPageClient({ businesses }: { businesses: DemoBusiness[] }) {
  const [selectedBusiness, setSelectedBusiness] = useState<DemoBusiness | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [assistantChatOpen, setAssistantChatOpen] = useState(false)
  const [phoneModalOpen, setPhoneModalOpen] = useState(false)
  const [phoneMode, setPhoneMode] = useState<'customer' | 'assistant'>('customer')
  const detailRef = useRef<HTMLDivElement>(null)

  const handleSelectBusiness = (biz: DemoBusiness) => {
    setSelectedBusiness(biz)
    setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const openPhone = (mode: 'customer' | 'assistant') => {
    setPhoneMode(mode)
    setPhoneModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-white border-b">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <Badge variant="secondary" className="mb-4">Keine Anmeldung erforderlich</Badge>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Erleben Sie Hebelki live
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Testen Sie unseren KI-Assistenten — als Kunde oder als Geschäftsinhaber
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: Building2, step: '1', title: 'Betrieb auswählen', desc: 'Wählen Sie eine Branche' },
            { icon: Bot, step: '2', title: 'Assistent & Kanal wählen', desc: 'Kunden- oder Geschäftsassistent' },
            { icon: Sparkles, step: '3', title: 'Live testen', desc: 'Chatten oder anrufen lassen' },
          ].map((item) => (
            <Card key={item.step} className="text-center">
              <CardContent className="pt-6">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <item.icon className="h-6 w-6 text-gray-700" />
                </div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Schritt {item.step}</p>
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Business Selection Grid */}
      <section className="mx-auto max-w-5xl px-4 pb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Demo-Betriebe</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((biz) => {
            const meta = BUSINESS_META[biz.slug] || {
              icon: Building2,
              typeLabel: biz.type,
              shortDescription: biz.description || '',
            }
            const Icon = meta.icon
            const color = biz.primaryColor || '#3B82F6'
            const isSelected = selectedBusiness?.id === biz.id

            return (
              <Card
                key={biz.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? 'ring-2 shadow-md' : ''
                }`}
                style={isSelected ? { borderColor: color, ringColor: color } as React.CSSProperties : undefined}
                onClick={() => handleSelectBusiness(biz)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <Icon className="h-5 w-5" style={{ color }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{biz.name}</h3>
                      <Badge variant="outline" className="mt-1 text-xs">{meta.typeLabel}</Badge>
                      <p className="mt-2 text-sm text-gray-500 line-clamp-2">{meta.shortDescription}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {businesses.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Building2 className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p>Keine Demo-Betriebe verfügbar.</p>
          </div>
        )}
      </section>

      {/* Selected Business Detail */}
      {selectedBusiness && (() => {
        const meta = BUSINESS_META[selectedBusiness.slug] || {
          icon: Building2,
          typeLabel: selectedBusiness.type,
          shortDescription: selectedBusiness.description || '',
        }
        const color = selectedBusiness.primaryColor || '#3B82F6'

        return (
          <section ref={detailRef} className="mx-auto max-w-5xl px-4 pb-12">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedBusiness.name}</h2>
                  <Badge variant="outline">{meta.typeLabel}</Badge>
                </div>
                <p className="text-gray-600">{meta.shortDescription}</p>
              </div>

              {/* Two assistant cards */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Card A: Customer Assistant */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" style={{ color }} />
                      Kundenassistent
                    </CardTitle>
                    <CardDescription>Testen Sie, was Ihre Kunden erleben</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Termine buchen, Fragen stellen, Verfügbarkeit prüfen
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        className="w-full"
                        style={{ backgroundColor: color }}
                        onClick={() => setChatOpen(true)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Text Chat
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => openPhone('customer')}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Anrufen lassen
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Card B: Internal Assistant */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" style={{ color }} />
                      Virtueller Assistent
                    </CardTitle>
                    <CardDescription>Testen Sie Ihren persönlichen Geschäftsassistenten</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Termine verwalten, Tagesplan abrufen, Zusammenfassungen erhalten
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        className="w-full"
                        style={{ backgroundColor: color }}
                        onClick={() => setAssistantChatOpen(true)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Text Chat
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => openPhone('assistant')}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Anrufen lassen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Customer Chat Dialog */}
            <Dialog open={chatOpen} onOpenChange={setChatOpen}>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">{selectedBusiness.name} — Kundenchat</h3>
                  <p className="text-sm text-gray-500">Kundenansicht</p>
                </div>
                <div className="p-4">
                  <ChatInterface
                    businessId={selectedBusiness.id}
                    businessName={selectedBusiness.name}
                    primaryColor={color}
                    welcomeMessage={`Hallo! Willkommen bei ${selectedBusiness.name}. Wie kann ich Ihnen helfen?`}
                  />
                </div>
              </DialogContent>
            </Dialog>

            {/* Assistant Chat Dialog */}
            <Dialog open={assistantChatOpen} onOpenChange={setAssistantChatOpen}>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">{selectedBusiness.name} — Interner Assistent</h3>
                  <p className="text-sm text-gray-500">Geschäftsansicht</p>
                </div>
                <div className="p-4">
                  <DemoAssistantChat
                    businessId={selectedBusiness.id}
                    businessName={selectedBusiness.name}
                    primaryColor={color}
                  />
                </div>
              </DialogContent>
            </Dialog>

            {/* Phone Call Modal */}
            <PhoneCallModal
              open={phoneModalOpen}
              onOpenChange={setPhoneModalOpen}
              businessSlug={selectedBusiness.slug}
              businessName={selectedBusiness.name}
              mode={phoneMode}
            />
          </section>
        )
      })()}

      {/* Features Overview */}
      <section className="bg-white border-t">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Was Hebelki kann</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Radio, title: 'Multi-Kanal', desc: 'Chat, Voice, WhatsApp' },
              { icon: BookOpen, title: 'Wissensdatenbank', desc: 'Automatische FAQ-Antworten' },
              { icon: CalendarCheck, title: 'Terminbuchung', desc: 'KI-gesteuerte Buchung' },
              { icon: Shield, title: 'DSGVO-konform', desc: 'EU-gehostet, verschlüsselt' },
            ].map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <feature.icon className="h-5 w-5 text-gray-700" />
                </div>
                <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild size="lg">
              <Link href="/sign-up">Jetzt kostenlos starten</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
