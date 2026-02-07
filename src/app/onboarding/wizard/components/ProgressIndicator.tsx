import { Building2, Globe, Users, Package, Calendar, CheckCircle, LucideIcon } from 'lucide-react'

interface Step {
  id: number
  name: string
  icon: LucideIcon
}

interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
}

export function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  const steps: Step[] = [
    { id: 1, name: 'Unternehmen', icon: Building2 },
    { id: 2, name: 'Website', icon: Globe },
    { id: 3, name: 'Mitarbeiter', icon: Users },
    { id: 4, name: 'Leistungen', icon: Package },
    { id: 5, name: 'Kalender', icon: Calendar },
    { id: 6, name: 'Fertig', icon: CheckCircle }
  ]

  return (
    <nav className="flex items-center justify-between" aria-label="Progress">
      {steps.map((step, idx) => {
        const Icon = step.icon
        const status =
          currentStep > step.id
            ? 'complete'
            : currentStep === step.id
            ? 'current'
            : 'upcoming'

        return (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex flex-col items-center ${
                status === 'complete'
                  ? 'text-green-600'
                  : status === 'current'
                  ? 'text-blue-600'
                  : 'text-gray-400'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                  status === 'complete'
                    ? 'bg-green-100 border-green-600'
                    : status === 'current'
                    ? 'bg-blue-100 border-blue-600'
                    : 'bg-gray-100 border-gray-300'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-sm mt-2 font-medium">{step.name}</span>
            </div>

            {idx < steps.length - 1 && (
              <div
                className={`w-16 h-1 mx-4 ${
                  currentStep > step.id ? 'bg-green-600' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
