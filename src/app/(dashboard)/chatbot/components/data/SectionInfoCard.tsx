'use client'

/**
 * SectionInfoCard
 *
 * Colored info card explaining each section's purpose.
 * 4 variants: chatbot (green), intern (blue), kunden (purple), daten (amber)
 */

import { Bot, Building2, User, Database } from 'lucide-react'
import { DataPurpose } from './DocumentList'

interface SectionInfoCardProps {
  purpose: DataPurpose
}

const sectionConfig: Record<DataPurpose, {
  icon: React.ElementType
  title: string
  description: string
  bgColor: string
  borderColor: string
  iconColor: string
  textColor: string
}> = {
  chatbot: {
    icon: Bot,
    title: 'Öffentliche Chatbot-Dokumente',
    description: 'Diese Dokumente sind für Kunden über den Chatbot sichtbar. Der Chatbot kann deren Inhalte verwenden, um Kundenanfragen zu beantworten.',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
    textColor: 'text-green-800',
  },
  intern: {
    icon: Building2,
    title: 'Interne Dokumente',
    description: 'Nur für Mitarbeiter und Inhaber sichtbar. Diese Dokumente werden nicht an Kunden weitergegeben, können aber vom Chatbot für interne Abfragen genutzt werden.',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    textColor: 'text-blue-800',
  },
  kunden: {
    icon: User,
    title: 'Kundendokumente',
    description: 'Dokumente, die einzelnen Kunden zugeordnet sind. Sie werden nur sichtbar, wenn der jeweilige Kunde identifiziert ist.',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    iconColor: 'text-purple-600',
    textColor: 'text-purple-800',
  },
  daten: {
    icon: Database,
    title: 'Geschäftsdaten',
    description: 'CSV- und Excel-Dateien mit Geschäftsdaten wie Kundenlisten, Produktkataloge, etc. Diese werden gespeichert, aber nicht für den Chatbot indexiert.',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-600',
    textColor: 'text-amber-800',
  },
}

export function SectionInfoCard({ purpose }: SectionInfoCardProps) {
  const config = sectionConfig[purpose]
  const Icon = config.icon

  return (
    <div className={`rounded-lg p-4 ${config.bgColor} border ${config.borderColor}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-white/60`}>
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>
        <div>
          <h3 className={`font-medium ${config.textColor}`}>
            {config.title}
          </h3>
          <p className={`mt-1 text-sm ${config.textColor} opacity-80`}>
            {config.description}
          </p>
        </div>
      </div>
    </div>
  )
}
