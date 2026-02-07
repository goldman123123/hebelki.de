'use client'

import { Suspense } from 'react'
import { WizardProvider, useWizard } from './context/WizardContext'
import { WizardErrorBoundary } from './components/ErrorBoundary'
import { ProgressIndicator } from './components/ProgressIndicator'
import { Step1BusinessSetup } from './components/steps/Step1BusinessSetup'
import { Step2WebsiteScraper } from './components/steps/Step2WebsiteScraper'
import { Step3StaffSetup } from './components/steps/Step3StaffSetup'
import { Step4ServiceSetup } from './components/steps/Step4ServiceSetup'
import { Step5CalendarPreview } from './components/steps/Step5CalendarPreview'
import { Step6Complete } from './components/steps/Step6Complete'

function WizardContent() {
  const { state, nextStep, prevStep, saveProgress } = useWizard()

  const handleNext = async () => {
    await saveProgress()
    nextStep()
  }

  const handleSkip = async () => {
    await saveProgress()
    nextStep()
  }

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return <Step1BusinessSetup onNext={handleNext} />
      case 2:
        return <Step2WebsiteScraper onNext={handleNext} onBack={prevStep} onSkip={handleSkip} />
      case 3:
        return <Step3StaffSetup onNext={handleNext} onBack={prevStep} onSkip={handleSkip} />
      case 4:
        return <Step4ServiceSetup onNext={handleNext} onBack={prevStep} onSkip={handleSkip} />
      case 5:
        return <Step5CalendarPreview onNext={handleNext} onBack={prevStep} onSkip={handleSkip} />
      case 6:
        return <Step6Complete />
      default:
        return <Step1BusinessSetup onNext={handleNext} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Einrichtungsassistent</h1>
          <p className="text-gray-600 mt-2">
            Machen Sie Ihr Unternehmen bereit für Buchungen
          </p>
        </div>

        <ProgressIndicator currentStep={state.step} totalSteps={6} />

        <div className="mt-8 bg-white rounded-lg shadow-sm p-8">
          {renderStep()}
        </div>
      </div>
    </div>
  )
}

export default function OnboardingWizard() {
  return (
    <WizardErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Assistent wird geladen...</p>
          </div>
        </div>
      }>
        <WizardProvider>
          <WizardContent />
        </WizardProvider>
      </Suspense>
    </WizardErrorBoundary>
  )
}
