'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CategorizedPage } from '@/lib/scraper/page-categorizer'
import {
  getDefaultWizardState,
  parseStepParam,
  parseModeParam,
  type WizardState,
} from '@/lib/validation/wizard-state'

interface WizardContextType {
  state: WizardState
  setState: (state: Partial<WizardState>) => void
  nextStep: () => void
  prevStep: () => void
  saveProgress: () => Promise<void>
}

const WizardContext = createContext<WizardContextType | null>(null)

export function WizardProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ✅ FIX: Initialize with defaults to avoid hydration mismatch
  // Don't read searchParams during initialization
  const [state, setState] = useState<WizardState>(getDefaultWizardState)

  // ✅ FIX: Sync state from URL after mount (client-side only)
  useEffect(() => {
    const stepParam = searchParams.get('step')
    const modeParam = searchParams.get('mode')

    let urlStep = parseStepParam(stepParam)
    let urlChoice: 'chatbot' | 'booking' | null = null

    // Handle re-entry mode
    if (modeParam) {
      const parsed = parseModeParam(modeParam)
      urlStep = parsed.step
      urlChoice = parsed.setupChoice
    }

    // Only update if URL params differ from current state
    if (urlStep !== state.step || (urlChoice && urlChoice !== state.setupChoice)) {
      setState((prev) => ({
        ...prev,
        step: urlStep,
        setupChoice: urlChoice || prev.setupChoice,
      }))
    }
  }, []) // Run once on mount

  // Sync URL when step changes
  useEffect(() => {
    const currentStepParam = searchParams.get('step')
    const currentStep = parseStepParam(currentStepParam)

    // Only update URL if step changed
    if (currentStep !== state.step) {
      router.push(`/onboarding/wizard?step=${state.step}`, { scroll: false })
    }
  }, [state.step])

  const nextStep = () => {
    const newStep = state.step + 1
    setState(prev => ({ ...prev, step: newStep }))
    router.push(`/onboarding/wizard?step=${newStep}`)
  }

  const prevStep = () => {
    const newStep = Math.max(1, state.step - 1)
    setState(prev => ({ ...prev, step: newStep }))
    router.push(`/onboarding/wizard?step=${newStep}`)
  }

  const saveProgress = async () => {
    if (!state.businessData?.id) return

    try {
      await fetch(`/api/businesses/${state.businessData.id}/onboarding-state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: state.step,
          chatbotSetup: !!state.scrapeJobId,
          bookingSetup: state.detectedServices.length > 0,
          staffConfigured: state.staffConfigured,
          setupChoice: state.setupChoice
        })
      })
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }

  const updateState = (partial: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...partial }))
  }

  return (
    <WizardContext.Provider
      value={{
        state,
        setState: updateState,
        nextStep,
        prevStep,
        saveProgress
      }}
    >
      {children}
    </WizardContext.Provider>
  )
}

export function useWizard() {
  const context = useContext(WizardContext)
  if (!context) {
    throw new Error('useWizard must be used within WizardProvider')
  }
  return context
}
