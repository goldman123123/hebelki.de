'use client'

import { useState, useEffect } from 'react'
import { useWizard } from '../../context/WizardContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, Edit, Check, AlertCircle, Loader2, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { createLogger } from '@/lib/logger'

const log = createLogger('app:onboarding:wizard:components:steps:Step4ServiceSetup')

interface StepProps {
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

interface ReviewableService {
  name: string
  description?: string
  durationMinutes?: number | null
  price?: number | null
  category?: string
  confidence: number
  approved: boolean
  staffIds?: string[]
}

interface StaffMember {
  id?: string
  name: string
  title?: string
}

// Staff Multi-Select Component
interface StaffMultiSelectProps {
  staff: StaffMember[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

function StaffMultiSelect({ staff, selectedIds, onChange }: StaffMultiSelectProps) {
  if (staff.length === 0) {
    return (
      <span className="text-sm text-gray-400 italic">
        Noch keine Mitarbeiter hinzugefügt
      </span>
    )
  }

  return (
    <div className="space-y-1 max-h-32 overflow-y-auto">
      {staff.map((member) => (
        <label
          key={member.id}
          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
        >
          <Checkbox
            checked={selectedIds.includes(member.id!)}
            onCheckedChange={(checked) => {
              if (checked) {
                onChange([...selectedIds, member.id!])
              } else {
                onChange(selectedIds.filter((id) => id !== member.id))
              }
            }}
          />
          <span className="text-sm">{member.name}</span>
          {member.title && (
            <span className="text-xs text-gray-500">({member.title})</span>
          )}
        </label>
      ))}
    </div>
  )
}

export function Step4ServiceSetup({ onNext, onBack, onSkip }: StepProps) {
  const { state, setState } = useWizard()
  const [services, setServices] = useState<ReviewableService[]>([])
  const [loading, setLoading] = useState(true)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Get staff from wizard context
  const staffMembers: StaffMember[] = (state.staffMembers || []).filter(s => s.id)

  // Load services from database on mount
  useEffect(() => {
    const loadServices = async () => {
      if (!state.businessData?.id) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/businesses/${state.businessData.id}`)
        if (!response.ok) throw new Error('Failed to load business data')

        const business = await response.json()
        const onboardingState = business.onboardingState || {}
        const servicesForReview = onboardingState.servicesForReview || []

        // Convert to ReviewableService format
        const reviewableServices: ReviewableService[] = servicesForReview.map((s: Omit<ReviewableService, 'approved'>) => ({
          name: s.name,
          description: s.description,
          durationMinutes: s.durationMinutes,
          price: s.price,
          category: s.category,
          confidence: s.confidence || 100,
          approved: true
        }))

        setServices(reviewableServices)
        setState({ detectedServices: reviewableServices })
      } catch (err) {
        log.error('Failed to load services:', err)
        setError('Failed to load detected services')
      } finally {
        setLoading(false)
      }
    }

    loadServices()
  }, [state.businessData?.id])

  const handleToggleApprove = (index: number) => {
    setServices(prev => prev.map((s, i) =>
      i === index ? { ...s, approved: !s.approved } : s
    ))
  }

  const handleEdit = (index: number, field: string, value: string | number | boolean | null | string[]) => {
    setServices(prev => prev.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    ))
  }

  const handleDelete = (index: number) => {
    setServices(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveServices = async () => {
    if (!state.businessData?.id) {
      setError('Business data not found')
      return
    }

    setSaving(true)
    setError('')

    try {
      const approvedServices = services.filter(s => s.approved)

      if (approvedServices.length === 0) {
        // No services to save - just skip to next step
        onNext()
        return
      }

      // Call API to save services
      const response = await fetch('/api/onboarding/save-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: state.businessData.id,
          services: approvedServices
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save services')
      }

      const result = await response.json()

      // Update wizard state
      setState({ detectedServices: approvedServices })

      // Continue to next step
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save services')
    } finally {
      setSaving(false)
    }
  }

  const approvedCount = services.filter(s => s.approved).length
  const skippedCount = services.length - approvedCount

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Erkannte Dienstleistungen prüfen</h2>
          <p className="text-gray-600">
            Dienstleistungen werden von Ihrer Website geladen...
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  if (services.length === 0) {
    // No services detected
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Erkannte Dienstleistungen prüfen</h2>
          <p className="text-gray-600">
            Keine Dienstleistungen auf Ihrer Website gefunden.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Keine Dienstleistungen gefunden</p>
            <p>
              Sie können Dienstleistungen später manuell im Dashboard hinzufügen oder zurückgehen und erneut scannen.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <Button onClick={onBack} variant="outline">Zurück</Button>
          <Button onClick={onSkip}>Ohne Dienstleistungen fortfahren</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
          <Package className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold">Ihre Dienstleistungen einrichten</h2>
        <p className="text-lg text-gray-600">
          {services.length > 0
            ? `Wir haben ${services.length} Dienstleistung${services.length !== 1 ? 'en' : ''} auf Ihrer Website gefunden. Prüfen und bearbeiten Sie diese unten.`
            : 'Fügen Sie die Dienstleistungen hinzu, die Sie Ihren Kunden anbieten.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Service Review Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-3 text-left w-12">
                <Checkbox
                  checked={services.every(s => s.approved)}
                  onCheckedChange={(checked) => {
                    setServices(prev => prev.map(s => ({ ...s, approved: !!checked })))
                  }}
                />
              </th>
              <th className="px-3 py-3 text-left font-medium text-sm">Dienstleistungsname</th>
              <th className="px-3 py-3 text-left font-medium text-sm w-32">Dauer</th>
              <th className="px-3 py-3 text-left font-medium text-sm w-32">Preis</th>
              <th className="px-3 py-3 text-left font-medium text-sm w-32">Kategorie</th>
              {staffMembers.length > 0 && (
                <th className="px-3 py-3 text-left font-medium text-sm w-48">Mitarbeiter</th>
              )}
              <th className="px-3 py-3 text-left font-medium text-sm w-24">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service, index) => (
              <tr
                key={index}
                className={`border-b last:border-b-0 ${!service.approved ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}
              >
                <td className="px-3 py-3">
                  <Checkbox
                    checked={service.approved}
                    onCheckedChange={() => handleToggleApprove(index)}
                  />
                </td>
                <td className="px-3 py-3">
                  {editingIndex === index ? (
                    <div className="space-y-2">
                      <Input
                        value={service.name}
                        onChange={(e) => handleEdit(index, 'name', e.target.value)}
                        placeholder="Dienstleistungsname"
                        className="font-medium"
                      />
                      <Input
                        value={service.description || ''}
                        onChange={(e) => handleEdit(index, 'description', e.target.value)}
                        placeholder="Beschreibung"
                        className="text-sm"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">{service.name}</div>
                      {service.description && (
                        <div className="text-sm text-gray-500 line-clamp-2">{service.description}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        Konfidenz: {service.confidence}%
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  {editingIndex === index ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={service.durationMinutes || ''}
                        onChange={(e) => handleEdit(index, 'durationMinutes', e.target.value ? Number(e.target.value) : null)}
                        placeholder="60"
                        className="w-20"
                      />
                      <span className="text-sm text-gray-500">min</span>
                    </div>
                  ) : (
                    service.durationMinutes ? (
                      <span className="text-sm">{service.durationMinutes} Min.</span>
                    ) : (
                      <span className="text-sm text-gray-400">Nicht festgelegt</span>
                    )
                  )}
                </td>
                <td className="px-3 py-3">
                  {editingIndex === index ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">€</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={service.price || ''}
                        onChange={(e) => handleEdit(index, 'price', e.target.value ? Number(e.target.value) : null)}
                        placeholder="50"
                        className="w-20"
                      />
                    </div>
                  ) : (
                    service.price ? (
                      <span className="text-sm">{service.price} €</span>
                    ) : (
                      <span className="text-sm text-gray-400">Nicht festgelegt</span>
                    )
                  )}
                </td>
                <td className="px-3 py-3">
                  {editingIndex === index ? (
                    <Input
                      value={service.category || ''}
                      onChange={(e) => handleEdit(index, 'category', e.target.value)}
                      placeholder="general"
                      className="w-full"
                    />
                  ) : (
                    <span className="text-sm">{service.category || 'general'}</span>
                  )}
                </td>
                {staffMembers.length > 0 && (
                  <td className="px-3 py-3">
                    {editingIndex === index ? (
                      // Edit mode - show staff multi-select
                      <StaffMultiSelect
                        staff={staffMembers}
                        selectedIds={service.staffIds || []}
                        onChange={(ids) => handleEdit(index, 'staffIds', ids)}
                      />
                    ) : (
                      // View mode - show assigned staff names
                      <div className="text-sm">
                        {service.staffIds && service.staffIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {service.staffIds.map((staffId) => {
                              const staff = staffMembers.find((s) => s.id === staffId)
                              return staff ? (
                                <Badge key={staffId} variant="secondary" className="text-xs">
                                  {staff.name}
                                </Badge>
                              ) : null
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Alle Mitarbeiter</span>
                        )}
                      </div>
                    )}
                  </td>
                )}
                <td className="px-3 py-3">
                  <div className="flex gap-0.5">
                    {editingIndex === index ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingIndex(null)}
                        className="h-7 w-7 p-0"
                        title="Speichern"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingIndex(index)}
                        className="h-7 w-7 p-0"
                        title="Bearbeiten"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(index)}
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm">
          <strong>{approvedCount} Dienstleistung{approvedCount !== 1 ? 'en' : ''}</strong> werden gespeichert.
          {skippedCount > 0 && (
            <span className="text-gray-600">
              {' '}({skippedCount} übersprungen)
            </span>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={onBack} variant="outline" disabled={saving}>
          Zurück
        </Button>
        <Button onClick={handleSaveServices} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Wird gespeichert...
            </>
          ) : (
            `${approvedCount > 0 ? `${approvedCount} Dienstleistung${approvedCount !== 1 ? 'en' : ''} speichern` : 'Speichern & weiter'}`
          )}
        </Button>
        <Button variant="ghost" onClick={onSkip} disabled={saving}>
          Dienstleistungen überspringen
        </Button>
      </div>
    </div>
  )
}
