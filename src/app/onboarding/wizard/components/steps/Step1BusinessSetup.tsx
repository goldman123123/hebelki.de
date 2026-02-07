'use client'

import { useState } from 'react'
import { useWizard } from '../../context/WizardContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Building2, Loader2 } from 'lucide-react'

interface StepProps {
  onNext: () => void
}

export function Step1BusinessSetup({ onNext }: StepProps) {
  const { setState } = useWizard()
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Auto-generate slug from business name
      const slug = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      // Create business (API will use Clerk user email automatically)
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: businessName,
          slug,
          type: 'other', // Default type, can be changed later
          timezone: 'Europe/Berlin'
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create business')
      }

      const { business } = await response.json()

      // Store in wizard state
      setState({ businessData: business })

      // Continue to next step
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create business')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
          <Building2 className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold">Willkommen bei Hebelki</h2>
        <p className="text-lg text-gray-600">
          Beginnen wir mit Ihrem Unternehmensnamen
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <label htmlFor="name" className="text-sm font-medium text-gray-700">
          Unternehmensname <span className="text-red-500">*</span>
        </label>
        <Input
          id="name"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Mein Unternehmen"
          className="text-lg h-12"
          required
          autoFocus
        />
        <p className="text-sm text-gray-500">
          Sie können Ihre Buchungs-URL und andere Einstellungen später anpassen
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading || !businessName.trim()}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Wird erstellt...
            </>
          ) : (
            'Unternehmen erstellen & fortfahren'
          )}
        </Button>
      </div>
    </form>
  )
}
