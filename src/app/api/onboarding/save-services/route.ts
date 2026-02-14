import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { services as servicesTable, staffServices } from '@/lib/db/schema'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:onboarding:save-services')

export async function POST(request: NextRequest) {
  try {
    const { businessId, services } = await request.json()

    if (!businessId || !services || !Array.isArray(services)) {
      return NextResponse.json(
        { error: 'Missing or invalid data' },
        { status: 400 }
      )
    }

    if (services.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'No services to save'
      })
    }

    // Insert services and handle staff assignments in transaction
    const result = await db.transaction(async (tx) => {
      const insertedServices = []

      for (const service of services) {
        // Insert service
        const [newService] = await tx
          .insert(servicesTable)
          .values({
            businessId,
            name: service.name,
            description: service.description || '',
            durationMinutes: service.durationMinutes || 60,
            bufferMinutes: 0,
            price: service.price ? String(service.price) : null,
            category: service.category || 'general',
            capacity: 1,
            isActive: true,
          })
          .returning()

        // Assign staff to service if staffIds provided
        if (service.staffIds && Array.isArray(service.staffIds) && service.staffIds.length > 0) {
          const staffServiceValues = service.staffIds.map((staffId: string) => ({
            staffId,
            serviceId: newService.id,
          }))

          await tx.insert(staffServices).values(staffServiceValues)
        }

        insertedServices.push(newService)
      }

      return insertedServices
    })

    log.info(`Saved ${result.length} services for business ${businessId}`)

    return NextResponse.json({
      success: true,
      count: result.length,
      services: result
    })
  } catch (error) {
    log.error('Error saving services:', error)
    return NextResponse.json(
      {
        error: 'Failed to save services',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
