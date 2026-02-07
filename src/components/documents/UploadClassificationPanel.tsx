'use client'

/**
 * Upload Classification Panel
 *
 * Clear document purpose selection:
 * 1. Public Chatbot Knowledge - for public chatbot
 * 2. Internal Knowledge - for staff/owner only
 * 3. Customer Document - assigned to specific customer
 * 4. Business Data Import - CSV/Excel stored only
 */

import { useState, useEffect, useCallback } from 'react'
import { Label } from '@/components/ui/label'
import {
  AlertTriangle,
  Globe,
  Building2,
  User,
  Database,
  Bot,
  ChevronDown,
  Loader2,
} from 'lucide-react'

export interface ClassificationOptions {
  useAsKnowledge: boolean
  audience: 'public' | 'internal'
  scopeType: 'global' | 'customer'
  scopeId?: string
  dataClass: 'knowledge' | 'stored_only'
  containsPii: boolean
}

interface Customer {
  id: string
  name: string
  email: string | null
}

interface UploadClassificationPanelProps {
  filename: string
  businessId: string
  defaultScopeType?: 'global' | 'customer'
  defaultScopeId?: string
  customerName?: string
  onChange: (options: ClassificationOptions) => void
}

// Document purpose options
type DocumentPurpose =
  | 'public_knowledge'    // Public chatbot knowledge
  | 'internal_knowledge'  // Internal staff knowledge
  | 'customer_document'   // Assigned to specific customer
  | 'business_data'       // CSV/Excel stored only

// Determine if file is a spreadsheet type
function isSpreadsheet(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop()
  return ['csv', 'xlsx', 'xls'].includes(ext || '')
}

export function UploadClassificationPanel({
  filename,
  businessId,
  defaultScopeType = 'global',
  defaultScopeId,
  customerName,
  onChange,
}: UploadClassificationPanelProps) {
  const spreadsheet = isSpreadsheet(filename)
  const inCustomerContext = defaultScopeType === 'customer' && defaultScopeId

  // Determine initial purpose based on context
  const getInitialPurpose = (): DocumentPurpose => {
    if (spreadsheet) return 'business_data'
    if (inCustomerContext) return 'customer_document'
    return 'public_knowledge'
  }

  const [purpose, setPurpose] = useState<DocumentPurpose>(getInitialPurpose())
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(defaultScopeId)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)

  // Fetch customers when needed
  const fetchCustomers = useCallback(async () => {
    if (customers.length > 0 || loadingCustomers) return

    setLoadingCustomers(true)
    try {
      const response = await fetch(`/api/admin/customers?businessId=${businessId}&limit=100`)
      const data = await response.json()
      if (response.ok && data.customers) {
        setCustomers(data.customers)
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoadingCustomers(false)
    }
  }, [businessId, customers.length, loadingCustomers])

  // Load customers when customer_document is selected
  useEffect(() => {
    if (purpose === 'customer_document' && !inCustomerContext) {
      fetchCustomers()
    }
  }, [purpose, inCustomerContext, fetchCustomers])

  // Get selected customer name
  const getSelectedCustomerName = () => {
    if (inCustomerContext && customerName) return customerName
    const customer = customers.find(c => c.id === selectedCustomerId)
    return customer?.name || 'Kunde auswählen'
  }

  // Update parent when options change
  useEffect(() => {
    let options: ClassificationOptions

    switch (purpose) {
      case 'public_knowledge':
        options = {
          useAsKnowledge: true,
          audience: 'public',
          scopeType: 'global',
          scopeId: undefined,
          dataClass: 'knowledge',
          containsPii: false,
        }
        break
      case 'internal_knowledge':
        options = {
          useAsKnowledge: true,
          audience: 'internal',
          scopeType: 'global',
          scopeId: undefined,
          dataClass: 'knowledge',
          containsPii: false,
        }
        break
      case 'customer_document':
        options = {
          useAsKnowledge: true,
          audience: 'internal',
          scopeType: 'customer',
          scopeId: selectedCustomerId,
          dataClass: 'knowledge',
          containsPii: true,
        }
        break
      case 'business_data':
      default:
        options = {
          useAsKnowledge: false,
          audience: 'internal',
          scopeType: 'global',
          scopeId: undefined,
          dataClass: 'stored_only',
          containsPii: true,
        }
        break
    }

    onChange(options)
  }, [purpose, selectedCustomerId, onChange])

  // Purpose option component
  const PurposeOption = ({
    value,
    icon: Icon,
    iconColor,
    title,
    description,
    badge,
    disabled,
  }: {
    value: DocumentPurpose
    icon: React.ElementType
    iconColor: string
    title: string
    description: string
    badge?: string
    disabled?: boolean
  }) => (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
        disabled
          ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
          : purpose === value
            ? 'border-primary bg-primary/5 cursor-pointer'
            : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
      }`}
      onClick={() => !disabled && setPurpose(value)}
    >
      <div
        className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${
          purpose === value ? 'border-primary' : 'border-gray-300'
        }`}
      >
        {purpose === value && (
          <div className="h-2 w-2 rounded-full bg-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="font-medium text-gray-900">{title}</span>
          {badge && (
            <span className="text-xs font-normal text-gray-500">({badge})</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 py-4">
      {/* Header */}
      <div>
        <Label className="text-sm font-medium text-gray-700">
          Verwendungszweck
        </Label>
        <p className="text-xs text-gray-500 mt-0.5">
          Wählen Sie, wie dieses Dokument verwendet werden soll
        </p>
      </div>

      {/* Purpose options */}
      <div className="space-y-2">
        <PurposeOption
          value="public_knowledge"
          icon={Bot}
          iconColor="text-green-600"
          title="Chatbot-Wissen"
          description="Öffentlich für alle Kunden im Chatbot sichtbar"
          badge="empfohlen"
          disabled={spreadsheet}
        />

        <PurposeOption
          value="internal_knowledge"
          icon={Building2}
          iconColor="text-blue-600"
          title="Internes Wissen"
          description="Nur für Mitarbeiter und Inhaber sichtbar"
          disabled={spreadsheet}
        />

        <PurposeOption
          value="customer_document"
          icon={User}
          iconColor="text-purple-600"
          title="Kundendokument"
          description="Einem bestimmten Kunden zugeordnet"
        />

        <PurposeOption
          value="business_data"
          icon={Database}
          iconColor="text-amber-600"
          title="Geschäftsdaten"
          description="Nur speichern, nicht für Chatbot indexieren"
          badge={spreadsheet ? 'Standard für Tabellen' : undefined}
        />
      </div>

      {/* Customer selection for customer_document */}
      {purpose === 'customer_document' && !inCustomerContext && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Kunde auswählen
          </Label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <User className="h-4 w-4 text-purple-600 flex-shrink-0" />
                <span className={`truncate ${selectedCustomerId ? 'text-gray-900' : 'text-gray-500'}`}>
                  {getSelectedCustomerName()}
                </span>
              </div>
              {loadingCustomers ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : (
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${customerDropdownOpen ? 'rotate-180' : ''}`} />
              )}
            </button>

            {customerDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {loadingCustomers ? (
                  <div className="p-3 text-center text-gray-500 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Lädt Kunden...
                  </div>
                ) : customers.length === 0 ? (
                  <div className="p-3 text-center text-gray-500 text-sm">
                    Keine Kunden gefunden
                  </div>
                ) : (
                  customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(customer.id)
                        setCustomerDropdownOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
                        selectedCustomerId === customer.id ? 'bg-primary/5' : ''
                      }`}
                    >
                      <User className="h-4 w-4 text-purple-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{customer.name}</p>
                        {customer.email && (
                          <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {!selectedCustomerId && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Bitte wählen Sie einen Kunden aus
            </p>
          )}
        </div>
      )}

      {/* Customer context display */}
      {purpose === 'customer_document' && inCustomerContext && customerName && (
        <div className="rounded-lg bg-purple-50 p-3 text-sm text-purple-800 flex items-start gap-2">
          <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Zugeordnet zu: {customerName}</p>
            <p className="text-xs mt-0.5">
              Dieses Dokument wird nur im Kontext dieses Kunden sichtbar sein.
            </p>
          </div>
        </div>
      )}

      {/* Info boxes */}
      {purpose === 'public_knowledge' && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 flex items-start gap-2">
          <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Öffentliches Chatbot-Wissen</p>
            <p className="text-xs mt-0.5">
              Der Inhalt wird indexiert und kann von Kunden über den Chatbot abgefragt werden.
            </p>
          </div>
        </div>
      )}

      {purpose === 'business_data' && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
          <Database className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Nur Speicherung</p>
            <p className="text-xs mt-0.5">
              Die Datei wird gespeichert, aber nicht für den Chatbot indexiert.
              {spreadsheet && ' Tabellendaten können sensible Informationen enthalten.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
