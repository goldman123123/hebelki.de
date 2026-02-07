'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

const businessTypes = [
  { value: 'clinic', label: 'Klinik / Arztpraxis' },
  { value: 'salon', label: 'Salon / Spa' },
  { value: 'consultant', label: 'Berater / Coach' },
  { value: 'gym', label: 'Fitnessstudio' },
  { value: 'other', label: 'Sonstiges' },
]

const timezones = [
  { value: 'Europe/Berlin', label: 'Berlin (MEZ/MESZ)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'Asia/Tokyo', label: 'Tokio (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
]

export function OnboardingForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: '',
    timezone: 'Europe/Berlin',
    email: '',
  })

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create business')
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unternehmensdetails</CardTitle>
        <CardDescription>
          Erzählen Sie uns von Ihrem Unternehmen. Sie können diese Einstellungen später ändern.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Unternehmensname *</Label>
            <Input
              id="name"
              placeholder="Mein Unternehmen"
              value={formData.name}
              onChange={handleNameChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Buchungs-URL *</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">hebelki.de/book/</span>
              <Input
                id="slug"
                placeholder="mein-unternehmen"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                className="flex-1"
                required
              />
            </div>
            <p className="text-xs text-gray-500">
              Dies wird Ihre öffentliche Buchungsseiten-URL
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Unternehmensart *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              required
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Wählen Sie Ihre Unternehmensart" />
              </SelectTrigger>
              <SelectContent>
                {businessTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Zeitzone *</Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
              required
            >
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Zeitzone auswählen" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Kontakt-E-Mail (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="kontakt@meinunternehmen.de"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !formData.name || !formData.slug || !formData.type}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Unternehmen wird erstellt...
              </>
            ) : (
              'Unternehmen erstellen'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
