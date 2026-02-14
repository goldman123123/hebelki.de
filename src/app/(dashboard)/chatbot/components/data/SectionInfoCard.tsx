'use client'

/**
 * SectionInfoCard
 *
 * Colored info card explaining each section's purpose.
 * 4 variants: chatbot (green), intern (blue), kunden (purple), daten (amber)
 */

import { Bot, Building2, User, Database } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DataPurpose } from './DocumentList'

interface SectionInfoCardProps {
  purpose: DataPurpose
}

const sectionConfig: Record<DataPurpose, {
  icon: React.ElementType
  titleKey: string
  descKey: string
  bgColor: string
  borderColor: string
  iconColor: string
  textColor: string
}> = {
  chatbot: {
    icon: Bot,
    titleKey: 'chatbotTitle',
    descKey: 'chatbotDesc',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
    textColor: 'text-green-800',
  },
  intern: {
    icon: Building2,
    titleKey: 'internTitle',
    descKey: 'internDesc',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    textColor: 'text-blue-800',
  },
  kunden: {
    icon: User,
    titleKey: 'kundenTitle',
    descKey: 'kundenDesc',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    iconColor: 'text-purple-600',
    textColor: 'text-purple-800',
  },
  daten: {
    icon: Database,
    titleKey: 'datenTitle',
    descKey: 'datenDesc',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-600',
    textColor: 'text-amber-800',
  },
}

export function SectionInfoCard({ purpose }: SectionInfoCardProps) {
  const t = useTranslations('dashboard.chatbot.data.info')
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
            {t(config.titleKey)}
          </h3>
          <p className={`mt-1 text-sm ${config.textColor} opacity-80`}>
            {t(config.descKey)}
          </p>
        </div>
      </div>
    </div>
  )
}
