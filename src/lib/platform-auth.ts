import { auth } from '@clerk/nextjs/server'

const PLATFORM_ADMIN_IDS = (process.env.PLATFORM_ADMIN_CLERK_IDS || '')
  .split(',').map(id => id.trim()).filter(Boolean)

export function isPlatformAdminId(clerkUserId: string): boolean {
  return PLATFORM_ADMIN_IDS.includes(clerkUserId)
}

export async function requirePlatformAdmin(): Promise<string> {
  const { userId } = await auth()
  if (!userId || !isPlatformAdminId(userId)) throw new Error('Forbidden')
  return userId
}
