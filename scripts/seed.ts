import { config } from 'dotenv'
config({ path: '.env.local' })
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import {
  businesses,
  businessMembers,
  services,
  staff,
  staffServices,
  availabilityTemplates,
  availabilitySlots,
  availabilityOverrides,
  customers,
  bookings,
} from '../src/lib/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)

// Get Clerk user ID from environment variable or use a test placeholder
const CLERK_USER_ID = process.env.SEED_CLERK_USER_ID || 'user_test_seed_data'

async function seed() {
  console.log('🌱 Seeding database...\n')

  // Clear existing data (in reverse order of dependencies)
  console.log('Clearing existing data...')
  await db.delete(bookings)
  await db.delete(customers)
  await db.delete(availabilityOverrides)
  await db.delete(availabilitySlots)
  await db.delete(availabilityTemplates)
  await db.delete(staffServices)
  await db.delete(staff)
  await db.delete(services)
  await db.delete(businessMembers)
  await db.delete(businesses)
  console.log('✓ Cleared existing data\n')

  // Create PhysioPlus Business
  console.log('Creating PhysioPlus business...')
  console.log(`   Clerk User ID: ${CLERK_USER_ID}`)
  const [business] = await db
    .insert(businesses)
    .values({
      clerkUserId: CLERK_USER_ID,
      name: 'PhysioPlus Clinic',
      slug: 'physioplus',
      type: 'clinic',
      timezone: 'Europe/Berlin',
      currency: 'EUR',
      email: 'contact@physioplus.de',
      phone: '+49 30 1234567',
      address: 'Hauptstraße 42, 10115 Berlin',
      website: 'https://physioplus.de',
      primaryColor: '#0EA5E9',
      minBookingNoticeHours: 24,
      maxAdvanceBookingDays: 60,
      cancellationPolicyHours: 24,
      allowWaitlist: true,
      requireApproval: false,
    })
    .returning()
  console.log(`✓ Created business: ${business.name} (${business.slug})\n`)

  // Create Services
  console.log('Creating services...')
  const [initialEval, followUp, sportsRehab, manualTherapy] = await db
    .insert(services)
    .values([
      {
        businessId: business.id,
        name: 'Initial Evaluation',
        description: 'Comprehensive assessment of your condition including medical history, physical examination, and treatment plan development.',
        durationMinutes: 60,
        bufferMinutes: 15,
        price: '120.00',
        category: 'Evaluation',
        sortOrder: 1,
      },
      {
        businessId: business.id,
        name: 'Follow-up Session',
        description: 'Regular treatment session to continue your rehabilitation program.',
        durationMinutes: 45,
        bufferMinutes: 10,
        price: '80.00',
        category: 'Treatment',
        sortOrder: 2,
      },
      {
        businessId: business.id,
        name: 'Sports Rehabilitation',
        description: 'Specialized treatment for sports-related injuries with focus on return to activity.',
        durationMinutes: 60,
        bufferMinutes: 15,
        price: '100.00',
        category: 'Specialty',
        sortOrder: 3,
      },
      {
        businessId: business.id,
        name: 'Manual Therapy',
        description: 'Hands-on techniques to improve mobility and reduce pain.',
        durationMinutes: 30,
        bufferMinutes: 10,
        price: '60.00',
        category: 'Treatment',
        sortOrder: 4,
      },
    ])
    .returning()
  console.log(`✓ Created ${4} services\n`)

  // Create Staff
  console.log('Creating staff...')
  const [drMiller, thomasBerg, linaSchmidt] = await db
    .insert(staff)
    .values([
      {
        businessId: business.id,
        name: 'Dr. Sarah Miller',
        email: 'sarah.miller@physioplus.de',
        phone: '+49 30 1234567',
        title: 'Physical Therapist, MSc',
        bio: 'Over 10 years of experience in orthopedic and sports physical therapy. Specializes in post-surgical rehabilitation.',
      },
      {
        businessId: business.id,
        name: 'Thomas Berg',
        email: 'thomas.berg@physioplus.de',
        title: 'Sports Physiotherapist',
        bio: 'Former professional athlete with expertise in sports injuries and performance optimization.',
      },
      {
        businessId: business.id,
        name: 'Lina Schmidt',
        email: 'lina.schmidt@physioplus.de',
        title: 'Manual Therapist',
        bio: 'Certified manual therapist with focus on chronic pain management and mobility improvement.',
      },
    ])
    .returning()
  console.log(`✓ Created ${3} staff members\n`)

  // Link Staff to Services
  console.log('Linking staff to services...')
  await db.insert(staffServices).values([
    // Dr. Miller can do all services
    { staffId: drMiller.id, serviceId: initialEval.id },
    { staffId: drMiller.id, serviceId: followUp.id },
    { staffId: drMiller.id, serviceId: sportsRehab.id },
    { staffId: drMiller.id, serviceId: manualTherapy.id },
    // Thomas specializes in sports and follow-up
    { staffId: thomasBerg.id, serviceId: followUp.id },
    { staffId: thomasBerg.id, serviceId: sportsRehab.id },
    // Lina does follow-up and manual therapy
    { staffId: linaSchmidt.id, serviceId: followUp.id },
    { staffId: linaSchmidt.id, serviceId: manualTherapy.id },
  ])
  console.log('✓ Linked staff to services\n')

  // Create Business Default Availability Template
  console.log('Creating availability template...')
  const [template] = await db
    .insert(availabilityTemplates)
    .values({
      businessId: business.id,
      staffId: null, // Business default
      name: 'Standard Hours',
      isDefault: true,
    })
    .returning()

  // Create Availability Slots (Mon-Fri 8-18, Sat 9-13)
  console.log('Creating availability slots...')
  const slots = [
    // Monday (1)
    { templateId: template.id, dayOfWeek: 1, startTime: '08:00', endTime: '18:00' },
    // Tuesday (2)
    { templateId: template.id, dayOfWeek: 2, startTime: '08:00', endTime: '18:00' },
    // Wednesday (3)
    { templateId: template.id, dayOfWeek: 3, startTime: '08:00', endTime: '18:00' },
    // Thursday (4)
    { templateId: template.id, dayOfWeek: 4, startTime: '08:00', endTime: '18:00' },
    // Friday (5)
    { templateId: template.id, dayOfWeek: 5, startTime: '08:00', endTime: '18:00' },
    // Saturday (6)
    { templateId: template.id, dayOfWeek: 6, startTime: '09:00', endTime: '13:00' },
  ]
  await db.insert(availabilitySlots).values(slots)
  console.log(`✓ Created availability schedule (Mon-Fri 8-18, Sat 9-13)\n`)

  // Create Business Members (for dev user switcher)
  console.log('Creating business members...')
  const testBusinessMembers = [
    {
      businessId: business.id,
      clerkUserId: CLERK_USER_ID, // Main owner (can be your real Clerk ID)
      role: 'owner',
      status: 'active',
      joinedAt: new Date('2023-12-01'),
    },
    {
      businessId: business.id,
      clerkUserId: 'user_39BpeA3jCcyxEh87W5ExKl9nNgO', // Sarah Miller (admin)
      role: 'admin',
      status: 'active',
      joinedAt: new Date('2024-01-15'),
    },
    {
      businessId: business.id,
      clerkUserId: 'user_39BpeGsrbC5YpiBr4qACT7zjVwK', // Thomas Berg (staff)
      role: 'staff',
      status: 'active',
      joinedAt: new Date('2024-02-01'),
    },
    {
      businessId: business.id,
      clerkUserId: 'user_39BprFTtTuT57hvTC71Qfb5wHsp', // Lina Schmidt (staff)
      role: 'staff',
      status: 'active',
      joinedAt: new Date('2024-03-10'),
    },
  ]

  await db.insert(businessMembers).values(testBusinessMembers)
  console.log(`✓ Created ${testBusinessMembers.length} business members\n`)

  console.log('═══════════════════════════════════════')
  console.log('✅ Database seeded successfully!')
  console.log('═══════════════════════════════════════\n')
  console.log('📋 Summary:')
  console.log(`   • Business: ${business.name}`)
  console.log(`   • Clerk User ID: ${CLERK_USER_ID}`)
  console.log(`   • Booking URL: /book/${business.slug}`)
  console.log(`   • Services: 4`)
  console.log(`   • Staff: 3`)
  console.log(`   • Business Members: ${testBusinessMembers.length}`)
  console.log(`   • Availability: Mon-Fri 8-18, Sat 9-13\n`)
  console.log('🚀 You can now test the booking widget at:')
  console.log(`   http://localhost:3005/book/${business.slug}\n`)

  if (CLERK_USER_ID === 'user_test_seed_data') {
    console.log('⚠️  Note: Using test Clerk user ID.')
    console.log('   To assign this data to your account, set SEED_CLERK_USER_ID')
    console.log('   in .env.local to your Clerk user ID before running seed.\n')
    console.log('   Example:')
    console.log('   SEED_CLERK_USER_ID=user_2abc123xyz npm run db:seed\n')
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
