'use client'

/**
 * ChangeScopeModal
 *
 * Modal dialog for changing document scope (audience/scopeType/scopeId).
 * Allows moving documents between tabs:
 * - Chatbot (public, global)
 * - Intern (internal, global)
 * - Kunden (public/internal, customer, requires scopeId)
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Bot, Lock, User, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Document } from './DocumentCard'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboard:chatbot:data:ChangeScopeModal')

interface Customer {
  id: string
  name: string
  email: string | null
}

interface ChangeScopeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: Document
  businessId: string
  onSuccess?: () => void
}

type ScopeOption = 'chatbot' | 'intern' | 'customer'

export function ChangeScopeModal({
  open,
  onOpenChange,
  document: doc,
  businessId,
  onSuccess,
}: ChangeScopeModalProps) {
  const t = useTranslations('dashboard.chatbot.data.changeScope')
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)

  // Determine initial scope from document
  const getInitialScope = (): ScopeOption => {
    if (doc.scopeType === 'customer') return 'customer'
    if (doc.audience === 'internal') return 'intern'
    return 'chatbot'
  }

  const [selectedScope, setSelectedScope] = useState<ScopeOption>(getInitialScope())
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(doc.scopeId || '')

  // Reset form when document changes or modal opens
  useEffect(() => {
    if (open) {
      setSelectedScope(getInitialScope())
      setSelectedCustomerId(doc.scopeId || '')
    }
  }, [open, doc.id])

  // Load customers when switching to customer scope
  useEffect(() => {
    if (selectedScope === 'customer' && customers.length === 0 && !loadingCustomers) {
      loadCustomers()
    }
  }, [selectedScope])

  const loadCustomers = async () => {
    setLoadingCustomers(true)
    try {
      const response = await fetch(`/api/admin/customers?limit=100`)
      const data = await response.json()

      if (response.ok && data.customers) {
        setCustomers(data.customers)
      }
    } catch (error) {
      log.error('Failed to load customers:', error)
      toast.error(t('loadError'))
    } finally {
      setLoadingCustomers(false)
    }
  }

  const handleSave = async () => {
    // Validate customer selection
    if (selectedScope === 'customer' && !selectedCustomerId) {
      toast.error(t('selectCustomerRequired'))
      return
    }

    setSaving(true)

    try {
      // Map scope option to API fields
      let audience: 'public' | 'internal'
      let scopeType: 'global' | 'customer'
      let scopeId: string | null

      switch (selectedScope) {
        case 'chatbot':
          audience = 'public'
          scopeType = 'global'
          scopeId = null
          break
        case 'intern':
          audience = 'internal'
          scopeType = 'global'
          scopeId = null
          break
        case 'customer':
          audience = 'public' // Customer docs are public to that customer
          scopeType = 'customer'
          scopeId = selectedCustomerId
          break
      }

      const response = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          audience,
          scopeType,
          scopeId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('saveError'))
      }

      toast.success(t('moved'))
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      log.error('Save scope error:', error)
      toast.error(error instanceof Error ? error.message : t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  // Check if anything changed
  const hasChanges = () => {
    const currentScope = getInitialScope()
    if (selectedScope !== currentScope) return true
    if (selectedScope === 'customer' && selectedCustomerId !== doc.scopeId) return true
    return false
  }

  const scopeOptions = [
    {
      value: 'chatbot' as ScopeOption,
      icon: Bot,
      iconColor: 'text-green-600',
      label: t('chatbot'),
      description: t('chatbotDesc'),
    },
    {
      value: 'intern' as ScopeOption,
      icon: Lock,
      iconColor: 'text-gray-600',
      label: t('internal'),
      description: t('internalDesc'),
    },
    {
      value: 'customer' as ScopeOption,
      icon: User,
      iconColor: 'text-purple-600',
      label: t('customer'),
      description: t('customerDesc'),
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description', { title: doc.title })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Scope selection */}
          <div className="space-y-3">
            <Label>{t('targetScope')}</Label>
            <div className="space-y-2">
              {scopeOptions.map((option) => {
                const Icon = option.icon
                const isSelected = selectedScope === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedScope(option.value)}
                    className={cn(
                      'flex items-center gap-3 w-full rounded-lg border p-3 text-left transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-full border',
                        isSelected
                          ? 'border-primary bg-primary'
                          : 'border-gray-300'
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <Icon className={cn('h-4 w-4', option.iconColor)} />
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-500">
                        {option.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Customer selector (only when customer scope selected) */}
          {selectedScope === 'customer' && (
            <div className="space-y-2">
              <Label htmlFor="customer-select">{t('selectCustomer')}</Label>
              {loadingCustomers ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('loadingCustomers')}
                </div>
              ) : customers.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">
                  {t('noCustomers')}
                </p>
              ) : (
                <Select
                  value={selectedCustomerId}
                  onValueChange={setSelectedCustomerId}
                >
                  <SelectTrigger id="customer-select">
                    <SelectValue placeholder={t('selectCustomerPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        <span className="font-medium">{customer.name}</span>
                        {customer.email && (
                          <span className="text-gray-500 ml-2">
                            ({customer.email})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges() || (selectedScope === 'customer' && !selectedCustomerId)}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('saving')}
              </>
            ) : (
              t('save')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
