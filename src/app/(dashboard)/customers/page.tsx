'use client'

/**
 * Customers Page
 *
 * Lists all customers with search, filtering and statistics
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  UserRound,
  Search,
  Plus,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  Loader2,
  X,
  ChevronRight,
  Tag,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboard:customers')

interface Customer {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  tags: string[]
  lastActivity: string | null
  bookingCount: number
  conversationCount: number
  createdAt: string | null
}

interface Pagination {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export default function CustomersPage() {
  const t = useTranslations('dashboard.customers')
  const tc = useTranslations('common')
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Create customer dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
  })

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      params.set('sortBy', 'name')
      params.set('limit', '50')

      const response = await fetch(`/api/admin/customers?${params}`)
      const data = await response.json()

      if (response.ok) {
        setCustomers(data.customers)
        setPagination(data.pagination)
      } else {
        toast.error(data.error || t('errorLoading'))
      }
    } catch (error) {
      log.error('Failed to fetch customers:', error)
      toast.error(t('errorLoading'))
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Create customer
  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast.error(t('nameRequired'))
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustomer.name.trim(),
          email: newCustomer.email.trim() || null,
          phone: newCustomer.phone.trim() || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(t('customerCreated'))
        setCreateDialogOpen(false)
        setNewCustomer({ name: '', email: '', phone: '' })
        // Navigate to the new customer
        router.push(`/customers/${data.customer.id}`)
      } else {
        toast.error(data.error || t('errorCreating'))
      }
    } catch (error) {
      log.error('Failed to create customer:', error)
      toast.error(t('errorCreating'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-2 text-gray-600">
            {t('subtitle')}
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('newCustomer')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results info */}
      {pagination && (
        <div className="text-sm text-gray-600">
          {t('customersFound', { total: pagination.total })}
        </div>
      )}

      {/* Customer List */}
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{t('loading')}</span>
          </div>
        </div>
      ) : customers.length === 0 ? (
        <Card className="p-12 text-center">
          <UserRound className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {debouncedSearch ? t('noCustomersFound') : t('noCustomersYet')}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {debouncedSearch
              ? t('tryDifferentSearch')
              : t('autoCreated')}
          </p>
          {!debouncedSearch && (
            <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('createFirstCustomer')}
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {customers.map((customer) => (
            <Card
              key={customer.id}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => router.push(`/customers/${customer.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="h-5 w-5" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900 truncate">
                        {customer.name || t('unnamed')}
                      </h3>
                      {customer.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {customer.tags.slice(0, 2).map((tag, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                            >
                              <Tag className="h-3 w-3" />
                              {tag}
                            </span>
                          ))}
                          {customer.tags.length > 2 && (
                            <span className="text-xs text-gray-400">
                              +{customer.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                      {customer.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3.5 w-3.5" />
                          {customer.email}
                        </span>
                      )}
                      {customer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {customer.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-1" title={t('bookings')}>
                    <Calendar className="h-4 w-4" />
                    <span>{customer.bookingCount}</span>
                  </div>
                  <div className="flex items-center gap-1" title={t('conversations')}>
                    <MessageSquare className="h-4 w-4" />
                    <span>{customer.conversationCount}</span>
                  </div>
                  {customer.lastActivity && (
                    <div className="text-gray-400 text-xs whitespace-nowrap">
                      {t('lastActivity')}:{' '}
                      {formatDistanceToNow(new Date(customer.lastActivity), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </div>
                  )}
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Customer Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createCustomer')}</DialogTitle>
            <DialogDescription>
              {t('createCustomerDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                {t('name')} <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Max Mustermann"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('email')}</label>
              <Input
                type="email"
                placeholder="max@example.com"
                value={newCustomer.email}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, email: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('phone')}</label>
              <Input
                type="tel"
                placeholder="+49 123 456789"
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, phone: e.target.value })
                }
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              {tc('cancel')}
            </Button>
            <Button onClick={handleCreateCustomer} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('creating')}
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  {tc('create')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
