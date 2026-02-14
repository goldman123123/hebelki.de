'use client'

import { useState } from 'react'
import { useWizard } from '../../context/WizardContext'
import { Button } from '@/components/ui/button'
import { WeeklyScheduleEditor } from '@/components/availability'
import { Clock } from 'lucide-react'
import { createLogger } from '@/lib/logger'

const log = createLogger('app:onboarding:wizard:components:steps:Step5CalendarPreview')

interface TimeSlot {
  startTime: string  // "HH:MM"
  endTime: string    // "HH:MM"
}

interface WeeklySchedule {
  [dayOfWeek: number]: TimeSlot[]  // 0=Sun, 1=Mon, ..., 6=Sat
}

interface StepProps {
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

export function Step5CalendarPreview({ onNext, onBack, onSkip }: StepProps) {
  const { state, setState } = useWizard()
  const [schedule, setSchedule] = useState<WeeklySchedule>({
    1: [{ startTime: '09:00', endTime: '17:00' }], // Mon
    2: [{ startTime: '09:00', endTime: '17:00' }], // Tue
    3: [{ startTime: '09:00', endTime: '17:00' }], // Wed
    4: [{ startTime: '09:00', endTime: '17:00' }], // Thu
    5: [{ startTime: '09:00', endTime: '17:00' }], // Fri
    // 0 (Sun) and 6 (Sat) omitted = closed
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!state.businessData?.id) return

    setIsSaving(true)
    setError(null)

    try {
      // Convert WeeklySchedule to API format
      const slots = Object.entries(schedule).flatMap(([dayOfWeek, timeSlots]) =>
        timeSlots.map((slot: TimeSlot) => ({
          dayOfWeek: parseInt(dayOfWeek),
          startTime: slot.startTime,
          endTime: slot.endTime,
        }))
      )

      // Create availability template
      const response = await fetch('/api/admin/availability/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: state.businessData.id,
          name: 'Default Business Hours',
          isDefault: true,
          staffId: null,  // Business-wide template
          slots,
        }),
      })

      if (!response.ok) throw new Error('Failed to save availability')

      // Update wizard state - calendar is configured
      // No need to update state, just proceed

      onNext()
    } catch (err) {
      setError('Failed to save availability. Please try again.')
      log.error('Error saving availability:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-2">
          <Clock className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Ihre Öffnungszeiten festlegen</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Konfigurieren Sie Ihre wöchentliche Verfügbarkeit, damit Kunden wissen, wann sie Termine buchen können.
        </p>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Wochenplan</h3>
          <p className="text-sm text-gray-600 mt-1">
            Legen Sie Ihre verfügbaren Zeiten für jeden Wochentag fest
          </p>
        </div>

        <div className="p-6">
          <WeeklyScheduleEditor
            schedule={schedule}
            onChange={setSchedule}
            disabled={isSaving}
          />
        </div>

        {error && (
          <div className="mx-6 mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 pb-6">
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Flexible Konfiguration</p>
              <p className="text-sm text-blue-800 mt-1">
                Diese Zeiten gelten unternehmensweit. Sie können später im Dashboard individuelle Zeiten pro Mitarbeiter festlegen und Sonderzeiten für bestimmte Tage hinzufügen.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSaving}
          size="lg"
          className="px-6"
        >
          Zurück
        </Button>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={isSaving}
            size="lg"
            className="px-6"
          >
            Jetzt überspringen
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="lg"
            className="px-8 bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Wird gespeichert...
              </span>
            ) : (
              'Speichern & weiter'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
