'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/forms'
import { Clock, Plus, Edit, Check, X, Trash2, Loader2, AlertCircle, Eye, EyeOff, Search, CheckSquare, Square } from 'lucide-react'
import { StaffPriorityInline } from './components/StaffPriorityInline'
import { ServiceDetector } from './components/ServiceDetector'

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

interface EditingService extends Partial<Service> {
  name: string
  durationMinutes: number
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [businessError, setBusinessError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<EditingService | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [newService, setNewService] = useState<EditingService>({
    name: '',
    description: '',
    category: '',
    durationMinutes: 60,
    bufferMinutes: 0,
    price: '',
    capacity: 1,
    isActive: true,
  })
  const [deleteService, setDeleteService] = useState<Service | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

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
        console.log('[Services] Business API response:', data)
        if (data.businesses?.[0]?.businessId) {
          setBusinessId(data.businesses[0].businessId)
        } else if (data.businesses?.length === 0) {
          setBusinessError('Kein Unternehmen gefunden. Bitte erstellen Sie zuerst ein Unternehmen.')
        } else if (data.error) {
          setBusinessError(data.error)
        }
      } catch (error) {
        console.error('Failed to fetch business:', error)
        setBusinessError('Fehler beim Laden des Unternehmens')
      }
    }
    fetchBusiness()
  }, [])

  const fetchServices = useCallback(async () => {
    try {
      // Add cache busting to prevent stale data
      const res = await fetch(`/api/admin/services?_t=${Date.now()}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      setServices(data.services || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  function startEditing(service: Service) {
    setEditingId(service.id)
    setEditingData({
      name: service.name,
      description: service.description || '',
      category: service.category || '',
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes || 0,
      price: service.price || '',
      capacity: service.capacity || 1,
      isActive: service.isActive ?? true,
    })
  }

  function cancelEditing() {
    setEditingId(null)
    setEditingData(null)
  }

  async function saveEditing(serviceId: string) {
    if (!editingData) return

    setSavingId(serviceId)
    try {
      const res = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingData),
      })
      if (res.ok) {
        setEditingId(null)
        setEditingData(null)
        fetchServices()
      }
    } finally {
      setSavingId(null)
    }
  }

  async function createService() {
    if (!newService.name.trim()) return

    setSavingId('new')
    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newService),
      })
      if (res.ok) {
        setCreatingNew(false)
        setNewService({
          name: '',
          description: '',
          category: '',
          durationMinutes: 60,
          bufferMinutes: 0,
          price: '',
          capacity: 1,
          isActive: true,
        })
        fetchServices()
      }
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteService) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/services/${deleteService.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (res.ok) {
        setDeleteService(null)
        await fetchServices()
      } else {
        alert(`Failed to delete service: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete service. Please try again.')
    } finally {
      setIsDeleting(false)
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

  // Filter services based on active/inactive toggle and search query
  // Note: isActive can be true, false, or null (treat null as true for backwards compatibility)
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      // Active/inactive filter
      if (!showInactive && s.isActive === false) return false

      // Search filter
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
  const grouped = filteredServices.reduce((acc, service) => {
    const cat = service.category || 'Uncategorized'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(service)
    return acc
  }, {} as Record<string, Service[]>)

  const activeCount = services.filter(s => s.isActive !== false).length
  const inactiveCount = services.filter(s => s.isActive === false).length

  // Selection helpers
  const allFilteredIds = filteredServices.map(s => s.id)
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id))
  const someSelected = selectedIds.size > 0

  const handleSelectAll = () => {
    if (allSelected) {
      // Unselect all
      setSelectedIds(new Set())
    } else {
      // Select all filtered services
      setSelectedIds(new Set(allFilteredIds))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    setIsBulkDeleting(true)
    try {
      // Delete each selected service
      const deletePromises = Array.from(selectedIds).map(id =>
        fetch(`/api/admin/services/${id}`, { method: 'DELETE' })
      )

      await Promise.all(deletePromises)

      setSelectedIds(new Set())
      setShowBulkDeleteDialog(false)
      await fetchServices()
    } catch (error) {
      console.error('Bulk delete error:', error)
      alert('Fehler beim Löschen der Services. Bitte erneut versuchen.')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-600 mt-1">
            Manage your service offerings
            {!loading && (
              <span className="ml-2">
                ({activeCount} active{inactiveCount > 0 && `, ${inactiveCount} inactive`})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {inactiveCount > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Hide Inactive
                </>
              ) : (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Show Inactive ({inactiveCount})
                </>
              )}
            </Button>
          )}
          <Button onClick={() => setCreatingNew(true)} disabled={creatingNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        </div>
      </div>

      {/* Search and Selection Controls */}
      {!loading && services.length > 0 && (
        <div className="mb-6 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Services durchsuchen (Name, Beschreibung, Kategorie)..."
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

          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="gap-2"
              >
                {allSelected ? (
                  <>
                    <Square className="h-4 w-4" />
                    Alle abwählen
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    Alle auswählen ({filteredServices.length})
                  </>
                )}
              </Button>

              {someSelected && (
                <span className="text-sm text-gray-600">
                  {selectedIds.size} ausgewählt
                </span>
              )}
            </div>

            {someSelected && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDeleteDialog(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Ausgewählte löschen ({selectedIds.size})
              </Button>
            )}
          </div>

          {/* Search Results Info */}
          {searchQuery && (
            <div className="text-sm text-gray-600">
              {filteredServices.length} {filteredServices.length === 1 ? 'Service' : 'Services'} gefunden
              {filteredServices.length < services.length && (
                <span className="text-gray-400"> von {services.length} gesamt</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Service Detector - Always visible */}
      <ServiceDetector
        businessId={businessId}
        businessError={businessError}
        onServicesAdded={fetchServices}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : activeCount === 0 && !creatingNew ? (
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
              <Button onClick={() => setCreatingNew(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ersten Service hinzufügen
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="space-y-6">
          {/* New Service Form */}
          {creatingNew && (
            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="text-lg">New Service</CardTitle>
                <CardDescription>Fill in the details for your new service</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Service Name *
                      </label>
                      <Input
                        value={newService.name}
                        onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                        placeholder="e.g., Haircut, Massage, Consultation"
                        className="font-medium"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Description
                      </label>
                      <Textarea
                        value={newService.description || ''}
                        onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                        placeholder="Describe your service..."
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Category
                      </label>
                      <Input
                        value={newService.category || ''}
                        onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                        placeholder="e.g., Hair, Wellness"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Duration (minutes) *
                      </label>
                      <Input
                        type="number"
                        value={newService.durationMinutes}
                        onChange={(e) => setNewService({ ...newService, durationMinutes: Number(e.target.value) })}
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Buffer Time (minutes)
                      </label>
                      <Input
                        type="number"
                        value={newService.bufferMinutes || 0}
                        onChange={(e) => setNewService({ ...newService, bufferMinutes: Number(e.target.value) })}
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Price (€)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newService.price || ''}
                        onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Capacity (Participants)
                      </label>
                      <Input
                        type="number"
                        value={newService.capacity || 1}
                        onChange={(e) => setNewService({ ...newService, capacity: Number(e.target.value) })}
                        min="1"
                        max="100"
                        placeholder="1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        How many people can book this service at the same time?
                        Set to 1 for private sessions, higher for group classes.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={createService}
                      disabled={!newService.name.trim() || savingId === 'new'}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {savingId === 'new' ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Save Service
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCreatingNew(false)
                        setNewService({
                          name: '',
                          description: '',
                          category: '',
                          durationMinutes: 60,
                          bufferMinutes: 0,
                          price: '',
                          capacity: 1,
                          isActive: true,
                        })
                      }}
                      disabled={savingId === 'new'}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Services by Category */}
          {Object.entries(grouped).map(([category, categoryServices]) => (
            <Card key={category}>
              <CardHeader className="bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{category}</CardTitle>
                    <CardDescription>
                      {categoryServices.length} service{categoryServices.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {categoryServices.map((service) => {
                    const isEditing = editingId === service.id
                    const isSaving = savingId === service.id

                    return (
                      <div
                        key={service.id}
                        className={`p-4 transition-colors ${isEditing ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                      >
                        {isEditing && editingData ? (
                          /* Edit Mode */
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                  Service Name
                                </label>
                                <Input
                                  value={editingData.name}
                                  onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                                  className="font-medium"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                  Description
                                </label>
                                <Textarea
                                  value={editingData.description || ''}
                                  onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                                  rows={2}
                                  className="resize-none"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                  Category
                                </label>
                                <Input
                                  value={editingData.category || ''}
                                  onChange={(e) => setEditingData({ ...editingData, category: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                  Duration (minutes)
                                </label>
                                <Input
                                  type="number"
                                  value={editingData.durationMinutes}
                                  onChange={(e) => setEditingData({ ...editingData, durationMinutes: Number(e.target.value) })}
                                  min="1"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                  Buffer Time (minutes)
                                </label>
                                <Input
                                  type="number"
                                  value={editingData.bufferMinutes || 0}
                                  onChange={(e) => setEditingData({ ...editingData, bufferMinutes: Number(e.target.value) })}
                                  min="0"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                  Price (€)
                                </label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editingData.price || ''}
                                  onChange={(e) => setEditingData({ ...editingData, price: e.target.value })}
                                  placeholder="0.00"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                  Capacity (Participants)
                                </label>
                                <Input
                                  type="number"
                                  value={editingData.capacity || 1}
                                  onChange={(e) => setEditingData({ ...editingData, capacity: Number(e.target.value) })}
                                  min="1"
                                  max="100"
                                  placeholder="1"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  How many people can book this service at the same time?
                                  Set to 1 for private sessions, higher for group classes.
                                </p>
                              </div>
                            </div>

                            {/* Staff Priority Section */}
                            <div className="border-t pt-4 mt-4">
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">Staff Priority</h4>
                              <p className="text-xs text-gray-500 mb-3">
                                Drag to reorder. Top staff are tried first for automatic assignment.
                              </p>
                              <StaffPriorityInline serviceId={service.id} />
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveEditing(service.id)}
                                disabled={isSaving || !editingData.name.trim()}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                {isSaving ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Save Changes
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                                disabled={isSaving}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* View Mode */
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {/* Selection Checkbox */}
                              <Checkbox
                                checked={selectedIds.has(service.id)}
                                onCheckedChange={() => handleToggleSelect(service.id)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-gray-900 text-lg">{service.name}</h3>
                                  {!service.isActive && (
                                    <Badge variant="outline" className="text-xs">
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                              {service.description && (
                                <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {service.durationMinutes} min
                                </span>
                                {service.bufferMinutes && service.bufferMinutes > 0 && (
                                  <span>+ {service.bufferMinutes} min buffer</span>
                                )}
                                {service.price ? (
                                  <span className="font-semibold text-gray-900">€{service.price}</span>
                                ) : (
                                  <span className="text-gray-400">Free</span>
                                )}
                                {service.capacity && service.capacity > 1 && (
                                  <Badge variant="secondary" className="ml-1">
                                    Group: {service.capacity} spots
                                  </Badge>
                                )}
                              </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleActive(service)}
                                className="gap-2"
                              >
                                {service.isActive ? (
                                  <>
                                    <EyeOff className="h-4 w-4" />
                                    Hide
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4" />
                                    Show
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(service)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeleteService(service)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteService}
        onOpenChange={(open) => !open && setDeleteService(null)}
        title="Delete Service"
        description={`Are you sure you want to delete "${deleteService?.name}"? This will hide it from your services list and prevent new bookings, but historical booking data will be preserved.`}
        onConfirm={handleDelete}
        isConfirming={isDeleting}
        confirmLabel="Delete"
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
