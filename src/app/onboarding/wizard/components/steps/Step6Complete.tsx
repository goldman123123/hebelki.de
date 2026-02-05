'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWizard } from '../../context/WizardContext'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'

export function Step6Complete() {
  const { state } = useWizard()
  const router = useRouter()
  const [hasChatbotData, setHasChatbotData] = useState(false)
  const [hasServices, setHasServices] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Mark onboarding as complete
    if (state.businessData?.id) {
      fetch(`/api/businesses/${state.businessData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboardingState: {
            completed: true,
            step: 5,
            chatbotSetup: !!state.scrapeJobId,
            bookingSetup: state.detectedServices.length > 0,
            setupChoice: state.setupChoice
          }
        })
      }).catch((error) => {
        console.error('Failed to mark onboarding complete:', error)
      })
    }
  }, [state.businessData, state.scrapeJobId, state.detectedServices, state.setupChoice])

  // Check actual completion status from database
  useEffect(() => {
    async function checkCompletion() {
      if (!state.businessData?.id) {
        setIsLoading(false)
        return
      }

      try {
        // Check if chatbot knowledge exists
        const knowledgeResponse = await fetch(
          `/api/chatbot/knowledge?businessId=${state.businessData.id}`
        )
        const knowledgeData = await knowledgeResponse.json()
        setHasChatbotData(knowledgeData.knowledge?.length > 0)

        // Check if services exist
        const servicesResponse = await fetch(
          `/api/admin/services?businessId=${state.businessData.id}`
        )
        const servicesData = await servicesResponse.json()
        setHasServices(servicesData.services?.length > 0)
      } catch (err) {
        console.error('Error checking completion:', err)
      } finally {
        setIsLoading(false)
      }
    }

    checkCompletion()
  }, [state.businessData?.id])

  const goToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="text-center space-y-6">
      <CheckCircle className="w-24 h-24 text-green-600 mx-auto" />

      <div>
        <h2 className="text-3xl font-bold mb-4">Setup Complete! 🎉</h2>
        <p className="text-gray-600 text-lg">
          Your business is now ready to accept bookings and answer customer questions.
        </p>
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-600 mt-2">Checking completion status...</p>
        </div>
      )}

      {!isLoading && (
        <div className="bg-gray-50 rounded-lg p-6 space-y-4 text-left max-w-2xl mx-auto">
          <h3 className="font-semibold text-lg">What&apos;s Next?</h3>

          <div className="space-y-3">
            {(state.scrapeJobId || hasChatbotData) && (
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium">Chatbot is ready</p>
                  <p className="text-sm text-gray-600">
                    Share your chat link:{' '}
                    <a
                      href={`/${state.businessData?.slug}/chat`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      hebelki.de/{state.businessData?.slug}/chat
                    </a>
                  </p>
                </div>
              </div>
            )}

            {(state.detectedServices.length > 0 || hasServices) && (
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium">Services configured</p>
                  <p className="text-sm text-gray-600">
                    Customers can now book appointments:{' '}
                    <a
                      href={`/book/${state.businessData?.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      hebelki.de/book/{state.businessData?.slug}
                    </a>
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <span className="w-5 h-5 border-2 border-gray-300 rounded-full mt-1 flex-shrink-0" />
              <div>
                <p className="font-medium">Explore your dashboard</p>
                <p className="text-sm text-gray-600">
                  Manage bookings, view analytics, and customize settings
                </p>
              </div>
            </div>

            {!state.scrapeJobId && !hasChatbotData && (
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 border-2 border-gray-300 rounded-full mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium">Set up your chatbot</p>
                  <p className="text-sm text-gray-600">
                    Go to the Chatbot page to add knowledge and start answering customer questions
                  </p>
                </div>
              </div>
            )}

            {state.detectedServices.length === 0 && !hasServices && (
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 border-2 border-gray-300 rounded-full mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium">Add your services</p>
                  <p className="text-sm text-gray-600">
                    Go to the Services page to set up your offerings and pricing
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Button size="lg" onClick={goToDashboard} className="mt-8">
        Go to Dashboard
      </Button>
    </div>
  )
}
