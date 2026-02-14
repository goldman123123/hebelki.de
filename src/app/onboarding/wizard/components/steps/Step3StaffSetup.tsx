'use client'

import { useState, useEffect } from 'react'
import { useWizard } from '../../context/WizardContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { WeeklyScheduleEditor } from '@/components/availability/WeeklyScheduleEditor'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Clock,
  ChevronDown,
  Info,
  Loader2
} from 'lucide-react'
import { createLogger } from '@/lib/logger'

const log = createLogger('app:onboarding:wizard:components:steps:Step3StaffSetup')

interface TimeSlot {
  startTime: string
  endTime: string
}

interface WeeklySchedule {
  [key: number]: TimeSlot[]
}

interface StaffMember {
  id?: string
  tempId: string
  name: string
  email?: string
  phone?: string
  title?: string
  availability: WeeklySchedule
}

interface StepProps {
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

interface StaffEditFormProps {
  staff: StaffMember
  onSave: (staff: StaffMember) => void
  onCancel: () => void
  isNew?: boolean
}

function StaffEditForm({ staff, onSave, onCancel, isNew }: StaffEditFormProps) {
  const [formData, setFormData] = useState(staff)
  const [showAvailability, setShowAvailability] = useState(false)

  const hasAvailability = Object.keys(formData.availability).length > 0

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700">
            Name <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Max Mustermann"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Titel</label>
          <Input
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Physiotherapeut"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">E-Mail</label>
          <Input
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="max@beispiel.de"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Telefon</label>
          <Input
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+49 123 456 7890"
            className="mt-1"
          />
        </div>
      </div>

      {/* Availability Section */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAvailability(!showAvailability)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          <Clock className="h-4 w-4" />
          Verfügbarkeit {showAvailability ? 'ausblenden' : 'festlegen'}
          {hasAvailability && !showAvailability && (
            <span className="text-xs text-gray-500">(konfiguriert)</span>
          )}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              showAvailability ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showAvailability && (
          <div className="mt-4">
            <WeeklyScheduleEditor
              schedule={formData.availability}
              onChange={(schedule) =>
                setFormData({ ...formData, availability: schedule })
              }
            />
            <p className="text-xs text-gray-500 mt-2">
              Lassen Sie Tage geschlossen, wenn dieser Mitarbeiter nicht verfügbar ist.
              Sie können dies später im Dashboard anpassen.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={() => onSave(formData)}
          disabled={!formData.name.trim()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Check className="h-4 w-4 mr-2" />
          {isNew ? 'Hinzufügen' : 'Änderungen speichern'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Abbrechen
        </Button>
      </div>
    </div>
  )
}

function getAvailabilitySummary(availability: WeeklySchedule): string {
  const days = Object.keys(availability).length
  if (days === 0) return 'Keine Verfügbarkeit festgelegt'

  const totalSlots = Object.values(availability).reduce(
    (sum, slots) => sum + slots.length,
    0
  )

  return `${days} Tag${days !== 1 ? 'e' : ''}, ${totalSlots} Zeitfenster`
}

export function Step3StaffSetup({ onNext, onBack, onSkip }: StepProps) {
  const { state, setState } = useWizard()
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [addingNew, setAddingNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newStaff, setNewStaff] = useState<StaffMember>({
    tempId: `temp-${Date.now()}`,
    name: '',
    availability: {}
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  // Load staff from wizard context on mount
  useEffect(() => {
    if (state.staffMembers) {
      setStaffMembers(state.staffMembers)
    }
  }, [state.staffMembers])

  const handleAddStaff = (staff: StaffMember) => {
    setStaffMembers((prev) => [...prev, staff])
    setAddingNew(false)
    setNewStaff({
      tempId: `temp-${Date.now()}`,
      name: '',
      availability: {}
    })
  }

  const handleUpdateStaff = (staff: StaffMember) => {
    setStaffMembers((prev) =>
      prev.map((s) => (s.tempId === staff.tempId ? staff : s))
    )
    setEditingId(null)
  }

  const handleRemoveStaff = (tempId: string) => {
    if (confirm('Möchten Sie diesen Mitarbeiter wirklich entfernen?')) {
      setStaffMembers((prev) => prev.filter((s) => s.tempId !== tempId))
    }
  }

  const handleSave = async () => {
    if (!state.businessData?.id) {
      setError('Business data not found')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      // Call API to create staff members with availability
      const response = await fetch('/api/onboarding/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: state.businessData.id,
          staffMembers: staffMembers
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save staff')
      }

      const result = await response.json()

      // Update wizard state with created staff IDs
      setState({
        staffMembers: result.staff,
        staffConfigured: true
      })

      onNext()
    } catch (err) {
      log.error('Error saving staff:', err)
      setError(err instanceof Error ? err.message : 'Failed to save staff members')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSkip = () => {
    setState({ staffMembers: [], staffConfigured: false })
    onSkip()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
          <Users className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold">Mitarbeiter hinzufügen</h2>
        <p className="text-lg text-gray-600">
          Richten Sie Ihre Teammitglieder und deren Verfügbarkeit ein
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Sie können diesen Schritt überspringen und Mitarbeiter später im Dashboard
          hinzufügen, wenn Sie Einzelunternehmer sind.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Staff List */}
      {staffMembers.length > 0 && (
        <div className="space-y-4">
          {staffMembers.map((staff) => (
            <Card key={staff.tempId}>
              <CardContent className="p-6">
                {editingId === staff.tempId ? (
                  // Edit Mode - Show form
                  <StaffEditForm
                    staff={staff}
                    onSave={handleUpdateStaff}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  // View Mode - Show summary
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">{staff.name}</h3>
                      {staff.title && (
                        <p className="text-gray-600">{staff.title}</p>
                      )}
                      {staff.email && (
                        <p className="text-sm text-gray-500">{staff.email}</p>
                      )}
                      {staff.phone && (
                        <p className="text-sm text-gray-500">{staff.phone}</p>
                      )}
                      <div className="mt-2 text-sm text-gray-600">
                        <Clock className="inline h-4 w-4 mr-1" />
                        {getAvailabilitySummary(staff.availability)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(staff.tempId)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Bearbeiten
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveStaff(staff.tempId)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Staff Form */}
      {addingNew && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle>Neuer Mitarbeiter</CardTitle>
          </CardHeader>
          <CardContent>
            <StaffEditForm
              staff={newStaff}
              onSave={handleAddStaff}
              onCancel={() => {
                setAddingNew(false)
                setNewStaff({
                  tempId: `temp-${Date.now()}`,
                  name: '',
                  availability: {}
                })
              }}
              isNew
            />
          </CardContent>
        </Card>
      )}

      {/* Add Staff Button */}
      {!addingNew && (
        <Button
          onClick={() => setAddingNew(true)}
          variant="outline"
          size="lg"
          className="w-full"
        >
          <Plus className="h-5 w-5 mr-2" />
          Mitarbeiter hinzufügen
        </Button>
      )}

      {/* Summary */}
      {staffMembers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">
            {staffMembers.length} Mitarbeiter hinzugefügt
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSaving}
          size="lg"
        >
          Zurück
        </Button>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSaving}
            size="lg"
          >
            Überspringen
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || staffMembers.length === 0}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Wird gespeichert...
              </>
            ) : (
              <>
                {staffMembers.length > 0
                  ? `${staffMembers.length} Mitarbeiter speichern`
                  : 'Speichern'}{' '}
                & weiter
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
