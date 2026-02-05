import { config } from 'dotenv'
config({ path: '.env.local' })

/**
 * Create test users in Clerk
 * These will be real Clerk users that can be used for dev testing
 */

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!

interface ClerkUser {
  id: string
  email_addresses: { email_address: string }[]
  first_name: string
  last_name: string
}

async function createClerkUser(
  email: string,
  firstName: string,
  lastName: string,
  password: string = 'TestPassword123!'
): Promise<ClerkUser> {
  const response = await fetch('https://api.clerk.com/v1/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: [email],
      password,
      first_name: firstName,
      last_name: lastName,
      skip_password_checks: true,
      skip_password_requirement: false,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create user ${email}: ${error}`)
  }

  return response.json()
}

async function main() {
  console.log('🔑 Creating test users in Clerk...\n')

  const testUsers = [
    { email: 'sarah.miller@test.hebelki.de', firstName: 'Sarah', lastName: 'Miller', role: 'admin' },
    { email: 'thomas.berg@test.hebelki.de', firstName: 'Thomas', lastName: 'Berg', role: 'staff' },
    { email: 'lina.schmidt@test.hebelki.de', firstName: 'Lina', lastName: 'Schmidt', role: 'staff' },
  ]

  const createdUsers: Array<ClerkUser & { role: string }> = []

  for (const user of testUsers) {
    try {
      console.log(`Creating: ${user.firstName} ${user.lastName} (${user.email})...`)
      const clerkUser = await createClerkUser(user.email, user.firstName, user.lastName)
      createdUsers.push({ ...clerkUser, role: user.role })
      console.log(`✓ Created with ID: ${clerkUser.id}\n`)
    } catch (error) {
      console.error(`❌ Failed to create ${user.email}:`, error)
      console.log('   (User might already exist)\n')
    }
  }

  console.log('\n═══════════════════════════════════════')
  console.log('✅ Clerk users created!')
  console.log('═══════════════════════════════════════\n')

  console.log('📋 User IDs for seed script:\n')
  createdUsers.forEach(user => {
    const email = user.email_addresses[0]?.email_address
    console.log(`// ${user.first_name} ${user.last_name} (${user.role})`)
    console.log(`clerkUserId: '${user.id}',\n`)
  })

  console.log('\n🔐 Test Login Credentials:')
  console.log('   Email: Any of the emails above')
  console.log('   Password: TestPassword123!\n')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Failed:', err)
    process.exit(1)
  })
