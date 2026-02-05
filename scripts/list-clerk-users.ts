import { config } from 'dotenv'
config({ path: '.env.local' })

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!

async function listUsers() {
  const response = await fetch('https://api.clerk.com/v1/users?limit=20', {
    headers: { 'Authorization': `Bearer ${CLERK_SECRET_KEY}` },
  })
  const data = await response.json()

  console.log('Clerk Users:\n')
  data.forEach((u: any) => {
    const email = u.email_addresses[0]?.email_address
    console.log(`${u.first_name} ${u.last_name}`)
    console.log(`  Email: ${email}`)
    console.log(`  ID: ${u.id}\n`)
  })
}

listUsers()
