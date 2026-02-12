export interface BusinessSettings {
  privacyPolicyUrl?: string
  dataRetentionDays?: number
  dpaAcceptedAt?: string
  dpaAcceptedBy?: string
  aiLiteracyAcknowledgedAt?: string
  aiLiteracyAcknowledgedBy?: string
  aiLiteracyVersion?: string
  aiDisclosureMessage?: string
  avvAcceptedAt?: string
  avvAcceptedBy?: string
  avvVersion?: string
  // Tax & Invoice
  taxId?: string
  taxRate?: number
  isKleinunternehmer?: boolean
  showLogoOnInvoice?: boolean
  // DPO (Datenschutzbeauftragter)
  dpoName?: string
  dpoEmail?: string
  dpoPhone?: string
  // WhatsApp BYOT
  twilioAccountSid?: string
  twilioAuthToken?: string
  hasTwilioAuthToken?: boolean
  twilioWhatsappNumber?: string
  whatsappEnabled?: boolean
  twilioVerifiedAt?: string
  twilioVerifiedBy?: string
  // Voice Assistant
  voiceEnabled?: boolean
  twilioPhoneNumber?: string
}

export interface Business {
  id: string
  name: string
  slug: string
  type: string
  tagline: string | null
  description: string | null
  foundedYear: number | null
  legalName: string | null
  legalForm: string | null
  registrationNumber: string | null
  registrationCourt: string | null
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  timezone: string | null
  currency: string | null
  logoUrl: string | null
  primaryColor: string | null
  socialInstagram: string | null
  socialFacebook: string | null
  socialLinkedin: string | null
  socialTwitter: string | null
  minBookingNoticeHours: number | null
  maxAdvanceBookingDays: number | null
  cancellationPolicyHours: number | null
  requireApproval: boolean | null
  requireEmailConfirmation: boolean | null
  allowWaitlist: boolean | null
  planId: string | null
  planStartedAt: string | null
  planExpiresAt: string | null
  customDomain: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  twilioPhoneNumber: string | null
  settings: BusinessSettings | null
}

export const CURRENT_AI_LITERACY_VERSION = '1.0'
export const CURRENT_AVV_VERSION = '1.0'
