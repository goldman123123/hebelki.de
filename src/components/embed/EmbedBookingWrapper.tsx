'use client'

import { useEffect, useRef } from 'react'
import { BookingWidget, type Business, type Service, type Staff, type Step } from '@/components/booking/BookingWidget'
import { sendToParent } from '@/lib/embed/post-message'

interface EmbedBookingWrapperProps {
  business: Business
  services: Service[]
  staff: Staff[]
}

export function EmbedBookingWrapper({ business, services, staff }: EmbedBookingWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-resize: observe body height changes and notify parent
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const height = document.documentElement.scrollHeight
      sendToParent('hebelki:resize', business.slug, { height })
    })

    observer.observe(document.body)

    // Send initial size
    sendToParent('hebelki:resize', business.slug, {
      height: document.documentElement.scrollHeight,
    })

    return () => observer.disconnect()
  }, [business.slug])

  const handleStepChange = (step: Step) => {
    sendToParent('hebelki:booking-step', business.slug, {
      step,
      index: ['service', 'staff', 'date', 'time', 'customer', 'confirmation'].indexOf(step),
    })
  }

  const handleBookingComplete = (data: { bookingId: string; service: string; dateTime: string }) => {
    sendToParent('hebelki:booking-complete', business.slug, data)
  }

  return (
    <div ref={containerRef}>
      <BookingWidget
        business={business}
        services={services}
        staff={staff}
        onStepChange={handleStepChange}
        onBookingComplete={handleBookingComplete}
      />
    </div>
  )
}
