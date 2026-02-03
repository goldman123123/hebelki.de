'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/forms'
import { ServiceForm } from '@/components/forms/ServiceForm'
import { formatCurrency } from '@/lib/utils'
import { Clock, Plus, Pencil, Trash2, Loader2, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
interface ServiceFormData {
  name: string
  description?: string | null
  category?: string | null
  durationMinutes: number
  bufferMinutes?: number
  price?: string | null
  isActive?: boolean
}

interface Service {
  id: string
  name: string
  description: string | null
  category: string | null
  durationMinutes: number
  bufferMinutes: number | null
  price: string | null
  isActive: boolean | null
  sortOrder: number | null
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [deleteService, setDeleteService] = useState<Service | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/services')
      const data = await res.json()
      setServices(data.services || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  async function handleCreate(data: ServiceFormData) {
    const res = await fetch('/api/admin/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      fetchServices()
    }
  }

  async function handleEdit(data: ServiceFormData) {
    if (!editingService) return
    const res = await fetch(`/api/admin/services/${editingService.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setEditingService(null)
      fetchServices()
    }
  }

  async function handleDelete() {
    if (!deleteService) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/services/${deleteService.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setDeleteService(null)
        fetchServices()
      }
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

  // Group by category
  const grouped = services.reduce((acc, service) => {
    const cat = service.category || 'Uncategorized'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(service)
    return acc
  }, {} as Record<string, Service[]>)

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-600">Manage your service offerings</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Service
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No services configured yet.</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, categoryServices]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{category}</CardTitle>
                <CardDescription>
                  {categoryServices.length} service{categoryServices.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {categoryServices.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{service.name}</span>
                          {!service.isActive && (
                            <Badge variant="outline" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {service.description && (
                          <p className="mt-1 text-sm text-gray-500">
                            {service.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {service.durationMinutes} min
                          </span>
                          {service.bufferMinutes && service.bufferMinutes > 0 && (
                            <span>+ {service.bufferMinutes} min buffer</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {service.price ? (
                            <span className="text-lg font-semibold">
                              {formatCurrency(service.price, 'EUR')}
                            </span>
                          ) : (
                            <span className="text-gray-400">Free</span>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingService(service)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(service)}>
                              {service.isActive ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteService(service)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ServiceForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={handleCreate}
      />

      <ServiceForm
        open={!!editingService}
        onOpenChange={(open) => !open && setEditingService(null)}
        onSubmit={handleEdit}
        defaultValues={editingService ? {
          name: editingService.name,
          description: editingService.description,
          category: editingService.category,
          durationMinutes: editingService.durationMinutes,
          bufferMinutes: editingService.bufferMinutes || 0,
          price: editingService.price,
          isActive: editingService.isActive ?? true,
        } : undefined}
        isEditing
      />

      <ConfirmDialog
        open={!!deleteService}
        onOpenChange={(open) => !open && setDeleteService(null)}
        title="Delete Service"
        description={`Are you sure you want to delete "${deleteService?.name}"? This will hide it from booking but preserve historical data.`}
        onConfirm={handleDelete}
        isConfirming={isDeleting}
        confirmLabel="Delete"
      />
    </div>
  )
}
