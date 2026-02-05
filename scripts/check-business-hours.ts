import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { db } from '../src/lib/db/index'
import { businesses, availabilityTemplates, availabilitySlots } from '../src/lib/db/schema'
import { eq } from 'drizzle-orm'

async function checkBusinessHours() {
  try {
    // Get all businesses
    const allBusinesses = await db.select().from(businesses)

    for (const business of allBusinesses) {
      console.log('\n====================================')
      console.log(`Business: ${business.name} (${business.slug})`)
      console.log(`Business ID: ${business.id}`)
      console.log(`Timezone: ${business.timezone}`)
      console.log(`Min booking notice: ${business.minBookingNoticeHours} hours`)

      // Get availability template
      const templates = await db
        .select()
        .from(availabilityTemplates)
        .where(eq(availabilityTemplates.businessId, business.id))

      console.log(`\nAvailability Templates: ${templates.length}`)

      for (const template of templates) {
        console.log(`\n  Template: ${template.name || 'Default'} (${template.scope})`)
        console.log(`  Template ID: ${template.id}`)

        // Get slots for this template
        const slots = await db
          .select()
          .from(availabilitySlots)
          .where(eq(availabilitySlots.templateId, template.id))

        console.log(`  Slots: ${slots.length}`)

        for (const slot of slots) {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          console.log(`    ${days[slot.dayOfWeek]}: ${slot.startTime} - ${slot.endTime}`)
        }
      }
    }

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkBusinessHours()
