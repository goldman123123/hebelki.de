'use client'

/**
 * Customer Detail Page
 *
 * Shows customer info with Overview and Documents tabs
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Loader2,
  UserRound,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { CustomerOverviewTab } from './components/CustomerOverviewTab'
import { CustomerDocumentsTab } from './components/CustomerDocumentsTab'

interface Customer {
  id: string
  businessId: string
  name: string | null
  email: string | null
  phone: string | null
  notes: string | null
  source: string | null
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

interface Stats {
  totalBookings: number
  totalConversations: number
  totalDocuments: number
}

interface CustomerData {
  customer: Customer
  recentBookings: Booking[]
  recentConversations: Conversation[]
  stats: Stats
}

const tabs = [
  { id: 'overview', label: 'Übersicht', icon: UserRound },
  { id: 'documents', label: 'Dokumente', icon: FileText },
]

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string

  const [data, setData] = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'documents'>('overview')

  const fetchCustomer = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/customers/${customerId}`)
      const result = await response.json()

      if (response.ok) {
        setData(result)
      } else {
        toast.error(result.error || 'Fehler beim Laden des Kunden')
        if (response.status === 404) {
          router.push('/customers')
        }
      }
    } catch (error) {
      console.error('Failed to fetch customer:', error)
      toast.error('Fehler beim Laden des Kunden')
    } finally {
      setLoading(false)
    }
  }, [customerId, router])

  useEffect(() => {
    fetchCustomer()
  }, [fetchCustomer])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Lädt...</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <Card className="p-8 text-center">
        <UserRound className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          Kunde nicht gefunden
        </h3>
        <Button className="mt-4" onClick={() => router.push('/customers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zur Übersicht
        </Button>
      </Card>
    )
  }

  const { customer, recentBookings, recentConversations, stats } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/customers')}
            className="mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {customer.name || 'Unbenannter Kunde'}
            </h1>
            <div className="mt-2 flex items-center gap-4 text-gray-600">
              {customer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {customer.email}
                </span>
              )}
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {customer.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-blue-700">
            <Calendar className="h-4 w-4" />
            <span>{stats.totalBookings} Buchungen</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-green-700">
            <MessageSquare className="h-4 w-4" />
            <span>{stats.totalConversations} Konversationen</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-purple-700">
            <FileText className="h-4 w-4" />
            <span>{stats.totalDocuments} Dokumente</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-gray-50 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <CustomerOverviewTab
          customer={customer}
          recentBookings={recentBookings}
          recentConversations={recentConversations}
          onRefresh={fetchCustomer}
        />
      )}

      {activeTab === 'documents' && (
        <CustomerDocumentsTab
          customerId={customerId}
          customerName={customer.name || 'Unbenannt'}
          businessId={customer.businessId}
        />
      )}
    </div>
  )
}
