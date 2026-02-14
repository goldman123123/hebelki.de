'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ConfirmDialog } from '@/components/forms'
import { Plus, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { ServiceCard } from './components/ServiceCard'
import { ServiceEditSheet } from './components/ServiceEditSheet'
import { ServiceToolbar } from './components/ServiceToolbar'
import { ServiceDetector } from './components/ServiceDetector'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboard:services')

interface Service {
  id: string
  name: string
  description: string | null
  category: string | null
  durationMinutes: number
  bufferMinutes: number | null
  price: string | null
  capacity: number | null
  isActive: boolean | null
  sortOrder: number | null
}

interface EditingService {
  name: string
  description?: string | null
  category?: string | null
  durationMinutes: number
  bufferMinutes?: number | null
  price?: string | null
  capacity?: number | null
  isActive?: boolean | null
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [businessError, setBusinessError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  // Sheet editing state
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [editServiceId, setEditServiceId] = useState<string | null>(null)
  const [editInitialData, setEditInitialData] = useState<EditingService | null>(null)
  const [isNewService, setIsNewService] = useState(false)

  // Delete state
  const [deleteService, setDeleteService] = useState<Service | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Search and selection state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Fetch business ID
  useEffect(() => {
    async function fetchBusiness() {
      try {
        const res = await fetch('/api/businesses/my')
        const data = await res.json()
        if (data.businesses?.[0]?.businessId) {
          setBusinessId(data.businesses[0].businessId)
        } else if (data.businesses?.length === 0) {
          setBusinessError('Kein Unternehmen gefunden. Bitte erstellen Sie zuerst ein Unternehmen.')
        } else if (data.error) {
          setBusinessError(data.error)
        }
      } catch (error) {
        log.error('Failed to fetch business:', error)
        setBusinessError('Fehler beim Laden des Unternehmens')
      }
    }
    fetchBusiness()
  }, [])

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/services?_t=${Date.now()}`, { cache: 'no-store' })
      const data = await res.json()
      setServices(data.services || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  // Filter services
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      if (!showInactive && s.isActive === false) return false
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesName = s.name.toLowerCase().includes(query)
        const matchesDescription = s.description?.toLowerCase().includes(query)
        const matchesCategory = s.category?.toLowerCase().includes(query)
        if (!matchesName && !matchesDescription && !matchesCategory) return false
      }
      return true
    })
  }, [services, showInactive, searchQuery])

  // Group by category
  const grouped = useMemo(() => {
    return filteredServices.reduce((acc, service) => {
      const cat = service.category || 'Uncategorized'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(service)
      return acc
    }, {} as Record<string, Service[]>)
  }, [filteredServices])

  const activeCount = services.filter(s => s.isActive !== false).length
  const inactiveCount = services.filter(s => s.isActive === false).length

  // Selection helpers
  const allFilteredIds = filteredServices.map(s => s.id)
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id))

  const handleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(allFilteredIds))
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  // Edit handlers
  function openNewServiceSheet() {
    setIsNewService(true)
    setEditServiceId(null)
    setEditInitialData({
      name: '',
      description: '',
      category: '',
      durationMinutes: 60,
      bufferMinutes: 0,
      price: '',
      capacity: 1,
      isActive: true,
    })
    setEditSheetOpen(true)
  }

  function openEditServiceSheet(service: Service) {
    setIsNewService(false)
    setEditServiceId(service.id)
    setEditInitialData({
      name: service.name,
      description: service.description || '',
      category: service.category || '',
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes || 0,
      price: service.price || '',
      capacity: service.capacity || 1,
      isActive: service.isActive ?? true,
    })
    setEditSheetOpen(true)
  }

  async function handleSaveService(data: EditingService) {
    if (isNewService) {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) await fetchServices()
    } else if (editServiceId) {
      const res = await fetch(`/api/admin/services/${editServiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) await fetchServices()
    }
  }

  async function handleToggleActive(service: Service) {
    await fetch(`/api/admin/services/${service.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !service.isActive }),
    })
    fetchServices()
  }

  async function handleDelete() {
    if (!deleteService) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/services/${deleteService.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteService(null)
        await fetchServices()
      } else {
        const data = await res.json()
        alert(`Fehler beim Löschen: ${data.error || 'Unbekannter Fehler'}`)
      }
    } catch {
      alert('Fehler beim Löschen. Bitte erneut versuchen.')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    setIsBulkDeleting(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => fetch(`/api/admin/services/${id}`, { method: 'DELETE' }))
      )
      setSelectedIds(new Set())
      setShowBulkDeleteDialog(false)
      await fetchServices()
    } catch {
      alert('Fehler beim Löschen der Services. Bitte erneut versuchen.')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dienstleistungen</h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie Ihre Dienstleistungen
            {!loading && (
              <span className="ml-2">
                ({activeCount} aktiv{inactiveCount > 0 && `, ${inactiveCount} inaktiv`})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {inactiveCount > 0 && (
            <Button variant="outline" onClick={() => setShowInactive(!showInactive)} size="sm">
              {showInactive ? (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Inaktive ausblenden</span>
                  <span className="sm:hidden">Ausblenden</span>
                </>
              ) : (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Inaktive anzeigen ({inactiveCount})</span>
                  <span className="sm:hidden">Inaktive ({inactiveCount})</span>
                </>
              )}
            </Button>
          )}
          <Button onClick={openNewServiceSheet}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Dienstleistung hinzufügen</span>
            <span className="sm:hidden">Hinzufügen</span>
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      {!loading && services.length > 0 && (
        <div className="mb-6">
          <ServiceToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filteredCount={filteredServices.length}
            totalCount={services.length}
            allSelected={allSelected}
            selectedCount={selectedIds.size}
            onSelectAll={handleSelectAll}
            onBulkDelete={() => setShowBulkDeleteDialog(true)}
          />
        </div>
      )}

      {/* Service Detector */}
      <ServiceDetector
        businessId={businessId}
        businessError={businessError}
        onServicesAdded={fetchServices}
      />

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : activeCount === 0 ? (
        <>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ersten Service hinzufügen</AlertTitle>
            <AlertDescription>
              Nutzen Sie die automatische Erkennung oben, um Services von Ihrer Website zu importieren, oder fügen Sie sie manuell hinzu.
            </AlertDescription>
          </Alert>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">Noch keine Services konfiguriert.</p>
              <Button onClick={openNewServiceSheet}>
                <Plus className="mr-2 h-4 w-4" />
                Ersten Service hinzufügen
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, categoryServices]) => (
            <Card key={category}>
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle>{category === 'Uncategorized' ? 'Ohne Kategorie' : category}</CardTitle>
                <CardDescription>
                  {categoryServices.length} Dienstleistung{categoryServices.length !== 1 ? 'en' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {categoryServices.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      selected={selectedIds.has(service.id)}
                      onToggleSelect={() => handleToggleSelect(service.id)}
                      onEdit={() => openEditServiceSheet(service)}
                      onToggleActive={() => handleToggleActive(service)}
                      onDelete={() => setDeleteService(service)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Sheet */}
      <ServiceEditSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        serviceId={editServiceId}
        initialData={editInitialData}
        onSave={handleSaveService}
        isNew={isNewService}
      />

      {/* Single Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteService}
        onOpenChange={(open) => !open && setDeleteService(null)}
        title="Dienstleistung löschen"
        description={`Sind Sie sicher, dass Sie "${deleteService?.name}" löschen möchten? Die Dienstleistung wird aus Ihrer Liste entfernt und neue Buchungen werden verhindert, aber bestehende Buchungsdaten bleiben erhalten.`}
        onConfirm={handleDelete}
        isConfirming={isDeleting}
        confirmLabel="Löschen"
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        title="Mehrere Services löschen"
        description={`Sind Sie sicher, dass Sie ${selectedIds.size} Service${selectedIds.size !== 1 ? 's' : ''} löschen möchten? Dies kann nicht rückgängig gemacht werden.`}
        onConfirm={handleBulkDelete}
        isConfirming={isBulkDeleting}
        confirmLabel={`${selectedIds.size} löschen`}
      />
    </div>
  )
}
