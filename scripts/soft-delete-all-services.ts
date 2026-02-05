import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { db } from '../src/lib/db'
import { services } from '../src/lib/db/schema'

async function softDeleteAllServices() {
  console.log('Soft deleting all services...')

  const result = await db
    .update(services)
    .set({ isActive: false })
    .returning()

  console.log(`✅ Soft deleted ${result.length} services`)
  console.log('Services:', result.map(s => ({ id: s.id, name: s.name, isActive: s.isActive })))

  process.exit(0)
}

softDeleteAllServices().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
