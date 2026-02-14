import { createLogger } from '@/lib/logger'

const log = createLogger('env-check')

// Voice relay runs as a standalone process and only needs DATABASE_URL + OPENAI_API_KEY
const isVoiceRelay = !!process.env.VOICE_RELAY_PORT

const REQUIRED_VARS: readonly string[] = isVoiceRelay
  ? ['DATABASE_URL']
  : ['DATABASE_URL', 'CLERK_SECRET_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']

const WARN_VARS = [
  'OPENROUTER_API_KEY',
  'SMTP_HOST',
  'STRIPE_SECRET_KEY',
] as const

let validated = false

export function validateEnv(): void {
  if (validated) return
  validated = true

  const missing: string[] = []

  for (const v of REQUIRED_VARS) {
    if (!process.env[v]) {
      missing.push(v)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Check your .env.local file.'
    )
  }

  for (const v of WARN_VARS) {
    if (!process.env[v]) {
      log.warn(`Optional env var ${v} is not set — related features will be disabled`)
    }
  }
}
