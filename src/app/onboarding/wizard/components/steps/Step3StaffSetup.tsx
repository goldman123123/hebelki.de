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
            placeholder="John Doe"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Title</label>
          <Input
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Physical Therapist"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Email</label>
          <Input
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@example.com"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Phone</label>
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
          {showAvailability ? 'Hide' : 'Set'} Availability
          {hasAvailability && !showAvailability && (
            <span className="text-xs text-gray-500">(configured)</span>
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
              Leave days closed if this staff member is not available. You can
              customize this later in the dashboard.
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
          {isNew ? 'Add Staff' : 'Save Changes'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  )
}

function getAvailabilitySummary(availability: WeeklySchedule): string {
  const days = Object.keys(availability).length
  if (days === 0) return 'No availability set'

  const totalSlots = Object.values(availability).reduce(
    (sum, slots) => sum + slots.length,
    0
  )

  return `${days} day${days !== 1 ? 's' : ''}, ${totalSlots} time slot${
    totalSlots !== 1 ? 's' : ''
  }`
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
    if (confirm('Are you sure you want to remove this staff member?')) {
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
      console.error('Error saving staff:', err)
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
        <h2 className="text-3xl font-bold">Add Your Staff</h2>
        <p className="text-lg text-gray-600">
          Set up your team members and their availability
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          You can skip this step and add staff later in the dashboard if you&apos;re
          a solo practitioner.
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
                        Edit
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
            <CardTitle>New Staff Member</CardTitle>
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
          Add Staff Member
        </Button>
      )}

      {/* Summary */}
      {staffMembers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">
            {staffMembers.length} staff member
            {staffMembers.length !== 1 ? 's' : ''} added
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
          Back
        </Button>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSaving}
            size="lg"
          >
            Skip for Now
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
                Saving...
              </>
            ) : (
              <>
                Save{' '}
                {staffMembers.length > 0
                  ? `${staffMembers.length} Staff`
                  : ''}{' '}
                & Continue
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
