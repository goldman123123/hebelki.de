/**
 * Plan Definitions & Helpers (Client-Safe)
 *
 * Pure data and functions — no DB imports.
 * Safe to import from 'use client' components.
 */

// ============================================
// PLAN DEFINITIONS
// ============================================

export type PlanId = 'free' | 'starter' | 'pro' | 'business'

export type Feature =
  | 'bookings'           // Core booking functionality
  | 'branding'           // Custom colors, logo
  | 'chatbot'            // AI chatbot for lead capture
  | 'tickets'            // Support ticket system
  | 'analytics'          // Advanced analytics dashboard
  | 'inventory'          // Inventory management
  | 'api'                // REST API access
  | 'whitelabel'         // Remove Hebelki branding
  | 'sms'                // SMS notifications
  | 'calendar_sync'      // Google Calendar sync
  | 'custom_domain'      // Custom domain support

export interface Plan {
  id: PlanId
  name: string
  description: string
  seatLimit: number | null  // null = unlimited
  features: Feature[]
  price: {
    monthly: number    // in EUR
    yearly: number     // in EUR
  }
}

export const plans: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: '1 Platz, nur Buchungen',
    seatLimit: 1,
    features: ['bookings'],
    price: {
      monthly: 0,
      yearly: 0,
    },
  },

  starter: {
    id: 'starter',
    name: 'Starter',
    description: '3 Plätze, Buchungen + Branding',
    seatLimit: 3,
    features: ['bookings', 'branding', 'sms', 'calendar_sync'],
    price: {
      monthly: 29,
      yearly: 290,  // 2 months free
    },
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    description: '10 Plätze, Buchungen + Branding + Chatbot + Tickets + Analytics',
    seatLimit: 10,
    features: [
      'bookings',
      'branding',
      'chatbot',
      'tickets',
      'analytics',
      'sms',
      'calendar_sync',
      'custom_domain',
    ],
    price: {
      monthly: 99,
      yearly: 990,  // 2 months free
    },
  },

  business: {
    id: 'business',
    name: 'Business',
    description: 'Unbegrenzte Plätze, alle Features',
    seatLimit: null,  // Unlimited
    features: [
      'bookings',
      'branding',
      'chatbot',
      'tickets',
      'analytics',
      'inventory',
      'api',
      'whitelabel',
      'sms',
      'calendar_sync',
      'custom_domain',
    ],
    price: {
      monthly: 299,
      yearly: 2990,  // 2 months free
    },
  },
}

// ============================================
// PLAN HELPERS
// ============================================

export function getPlan(planId: PlanId): Plan {
  return plans[planId] || plans.free
}

export function getAllPlans(): Plan[] {
  return Object.values(plans)
}

// ============================================
// FEATURE DESCRIPTIONS
// ============================================

export function getFeatureDescription(feature: Feature): string {
  const descriptions: Record<Feature, string> = {
    bookings: 'Buchungssystem',
    branding: 'Individuelles Branding (Logo, Farben)',
    chatbot: 'KI-Chatbot für Lead-Generierung',
    tickets: 'Support-Ticket-System',
    analytics: 'Erweiterte Analytik',
    inventory: 'Bestandsverwaltung',
    api: 'REST-API-Zugriff',
    whitelabel: 'Hebelki-Branding entfernen',
    sms: 'SMS-Benachrichtigungen',
    calendar_sync: 'Google Kalender-Synchronisierung',
    custom_domain: 'Benutzerdefinierte Domain',
  }

  return descriptions[feature] || feature
}

export function getAllFeatures(): Array<{ feature: Feature; description: string }> {
  const allFeatures: Feature[] = [
    'bookings',
    'branding',
    'chatbot',
    'tickets',
    'analytics',
    'inventory',
    'api',
    'whitelabel',
    'sms',
    'calendar_sync',
    'custom_domain',
  ]

  return allFeatures.map(feature => ({
    feature,
    description: getFeatureDescription(feature),
  }))
}

// ============================================
// PLAN COMPARISON HELPERS
// ============================================

export function wouldUnlockFeature(currentPlanId: PlanId, targetPlanId: PlanId, feature: Feature): boolean {
  const current = getPlan(currentPlanId)
  const target = getPlan(targetPlanId)

  return !current.features.includes(feature) && target.features.includes(feature)
}

export function getUnlockedFeatures(currentPlanId: PlanId, targetPlanId: PlanId): Feature[] {
  const current = getPlan(currentPlanId)
  const target = getPlan(targetPlanId)

  return target.features.filter(f => !current.features.includes(f))
}

// ============================================
// CUSTOM ERRORS
// ============================================

export class FeatureNotAvailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FeatureNotAvailableError'
  }
}

export class SeatLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SeatLimitError'
  }
}
