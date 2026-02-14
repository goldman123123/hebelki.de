import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  time,
  date,
  jsonb,
  index,
  uniqueIndex,
  vector,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ============================================
// TYPE DEFINITIONS
// ============================================

// Type definition for onboarding_state JSONB
export interface OnboardingState {
  completed: boolean
  step: number
  chatbotSetup?: boolean
  bookingSetup?: boolean
  calendarSetup?: boolean
  setupChoice?: 'chatbot' | 'booking'
  scrapeJobId?: string
  scrapeUrl?: string
  scrapeStatus?: 'processing' | 'completed' | 'failed'
  extractionComplete?: boolean
  knowledgeEntriesCreated?: number
  servicesCreated?: number
}

// ============================================
// BUSINESSES (Tenants)
// ============================================

export const businesses = pgTable('businesses', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id'), // Legacy field - kept for backward compatibility, no longer unique
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(), // URL: hebelki.de/book/[slug]
  type: text('type').notNull(), // 'clinic', 'salon', 'consultant', 'gym'

  // Legal/Registration (German business requirements)
  legalName: text('legal_name'), // Official registered name (Firmenname)
  legalForm: text('legal_form'), // GmbH, UG, GbR, Einzelunternehmer, etc.
  registrationNumber: text('registration_number'), // Handelsregisternummer (e.g., HRB 12345)
  registrationCourt: text('registration_court'), // Amtsgericht (e.g., "Amtsgericht Berlin-Charlottenburg")

  // Branding & Description
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color').default('#3B82F6'),
  tagline: text('tagline'), // Short slogan (max ~100 chars)
  description: text('description'), // About text / longer description

  // Location
  timezone: text('timezone').notNull().default('Europe/Berlin'),
  currency: text('currency').default('EUR'),

  // Contact
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  website: text('website'),

  // Social Media
  socialInstagram: text('social_instagram'),
  socialFacebook: text('social_facebook'),
  socialLinkedin: text('social_linkedin'),
  socialTwitter: text('social_twitter'),

  // Additional Info
  foundedYear: integer('founded_year'),

  // Booking policies
  minBookingNoticeHours: integer('min_booking_notice_hours').default(24),
  maxAdvanceBookingDays: integer('max_advance_booking_days').default(60),
  cancellationPolicyHours: integer('cancellation_policy_hours').default(24),
  allowWaitlist: boolean('allow_waitlist').default(true),
  requireApproval: boolean('require_approval').default(false),
  requireEmailConfirmation: boolean('require_email_confirmation').default(false),

  // Plan & billing
  planId: text('plan_id').default('free'), // free, starter, pro, business
  planStartedAt: timestamp('plan_started_at', { withTimezone: true }),
  planExpiresAt: timestamp('plan_expires_at', { withTimezone: true }),

  // Stripe billing
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),

  // Custom domain (Pro+ feature)
  customDomain: text('custom_domain'), // e.g., "termine.meinsalon.de"

  // Voice assistant (Twilio phone number for inbound calls)
  twilioPhoneNumber: text('twilio_phone_number'),

  // Onboarding wizard state tracking
  onboardingState: jsonb('onboarding_state').default({ completed: false, step: 1 }),

  // Flexible settings (branding, notifications, etc.)
  settings: jsonb('settings').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// BUSINESS MEMBERS (Multi-Tenant)
// ============================================

export const businessMembers = pgTable('business_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  clerkUserId: text('clerk_user_id').notNull(),

  // Role: owner, admin, staff
  role: text('role').notNull().default('staff'),

  // Status: invited, active, disabled
  status: text('status').notNull().default('active'),

  // Invitation tracking
  invitedBy: uuid('invited_by'),
  invitedAt: timestamp('invited_at', { withTimezone: true }),
  joinedAt: timestamp('joined_at', { withTimezone: true }),

  // Staff online detection (heartbeat via support dashboard polling)
  staffLastSeenAt: timestamp('staff_last_seen_at', { withTimezone: true }),

  // Per-member AI tool capabilities (null = use role defaults)
  // { allowedTools?: string[] }
  capabilities: jsonb('capabilities'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  businessUserIdx: uniqueIndex('business_members_business_user_idx').on(table.businessId, table.clerkUserId),
  clerkUserIdx: index('business_members_clerk_user_idx').on(table.clerkUserId),
}));

// ============================================
// EVENT OUTBOX (Async Processing)
// ============================================

export const eventOutbox = pgTable('event_outbox', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),

  // Event type: booking.created, booking.confirmed, booking.cancelled, member.invited, etc.
  eventType: text('event_type').notNull(),

  // Event payload (JSON)
  payload: jsonb('payload').notNull(),

  // Processing tracking
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  lastError: text('last_error'),

  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
}, (table) => ({
  // Index for fetching unprocessed events
  unprocessedIdx: index('event_outbox_unprocessed_idx').on(table.createdAt, table.attempts, table.processedAt),
  businessIdx: index('event_outbox_business_idx').on(table.businessId),
}));

// ============================================
// SERVICES
// ============================================

export const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull(),
  bufferMinutes: integer('buffer_minutes').default(0),
  price: decimal('price', { precision: 10, scale: 2 }),
  category: text('category'),

  // Booking capacity (1 = single booking, >1 = multiple concurrent bookings)
  capacity: integer('capacity').default(1),

  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  businessIdx: index('services_business_idx').on(table.businessId),
}));

// ============================================
// STAFF / PROVIDERS
// ============================================

export const staff = pgTable('staff', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  title: text('title'), // "Physical Therapist", "Stylist"
  bio: text('bio'),
  avatarUrl: text('avatar_url'),

  isActive: boolean('is_active').default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),

  // Per-staff AI tool capabilities (null = use role defaults)
  // { allowedTools?: string[] }
  capabilities: jsonb('capabilities'),

  settings: jsonb('settings').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  businessIdx: index('staff_business_idx').on(table.businessId),
}));

// Staff <-> Services (many-to-many)
export const staffServices = pgTable('staff_services', {
  staffId: uuid('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').default(999).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: uniqueIndex('staff_services_pk').on(table.staffId, table.serviceId),
  priorityIdx: index('idx_staff_services_priority').on(
    table.serviceId,
    table.isActive,
    table.sortOrder
  ),
}));

// ============================================
// AVAILABILITY
// ============================================

export const availabilityTemplates = pgTable('availability_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  staffId: uuid('staff_id').references(() => staff.id, { onDelete: 'cascade' }), // NULL = business default

  name: text('name').default('Default'),
  isDefault: boolean('is_default').default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const availabilitySlots = pgTable('availability_slots', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').notNull().references(() => availabilityTemplates.id, { onDelete: 'cascade' }),

  dayOfWeek: integer('day_of_week').notNull(), // 0=Sun, 6=Sat
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
}, (table) => ({
  templateIdx: index('availability_slots_template_idx').on(table.templateId),
  endAfterStartCheck: check('availability_slots_end_after_start', sql`${table.endTime} > ${table.startTime}`),
}));

// Date-specific overrides (holidays, special hours, time off)
export const availabilityOverrides = pgTable('availability_overrides', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  staffId: uuid('staff_id').references(() => staff.id, { onDelete: 'cascade' }), // NULL = all staff

  date: date('date').notNull(),
  isAvailable: boolean('is_available').default(false), // false = day off
  startTime: time('start_time'), // if available, custom hours
  endTime: time('end_time'),
  reason: text('reason'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  businessDateIdx: index('availability_overrides_business_date_idx').on(table.businessId, table.date),
}));

// ============================================
// CUSTOMERS
// ============================================

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),

  email: text('email'), // Nullable - allow customers with only phone
  name: text('name'),
  phone: text('phone'),
  notes: text('notes'), // internal notes
  source: text('source'), // Track origin: 'booking', 'chatbot_escalation', 'manual', 'whatsapp'

  // Address fields (for invoicing)
  street: text('street'),
  city: text('city'),
  postalCode: text('postal_code'),
  country: text('country').default('Deutschland'),

  customFields: jsonb('custom_fields').default({}),

  // WhatsApp Opt-In/Opt-Out Tracking (Twilio + Meta Compliance)
  whatsappOptInStatus: text('whatsapp_opt_in_status')
    .default('UNSET')
    .$type<'UNSET' | 'OPTED_IN' | 'OPTED_OUT'>(),
  whatsappOptInAt: timestamp('whatsapp_opt_in_at', { withTimezone: true }),
  whatsappOptInSource: text('whatsapp_opt_in_source'), // e.g., 'first_message', 'explicit_request', 'keyword_start'
  whatsappOptInEvidence: text('whatsapp_opt_in_evidence'), // message content that proves consent
  whatsappOptOutAt: timestamp('whatsapp_opt_out_at', { withTimezone: true }),
  whatsappOptOutReason: text('whatsapp_opt_out_reason'), // e.g., 'keyword_stop', message content

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Only enforce unique email if email is provided
  businessEmailIdx: uniqueIndex('customers_business_email_idx')
    .on(table.businessId, table.email)
    .where(sql`${table.email} IS NOT NULL`),
}));

// ============================================
// BOOKINGS
// ============================================

export const bookings = pgTable('bookings', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').references(() => services.id),
  staffId: uuid('staff_id').references(() => staff.id),
  customerId: uuid('customer_id').references(() => customers.id),

  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),

  // Status: unconfirmed | pending | confirmed | cancelled | completed | no_show
  status: text('status').default('pending'),

  // Token for customer actions (cancel/confirm links)
  confirmationToken: uuid('confirmation_token').defaultRandom(),

  // Google Calendar sync
  googleEventId: text('google_event_id'),

  // Details
  price: decimal('price', { precision: 10, scale: 2 }),
  notes: text('notes'), // customer notes
  internalNotes: text('internal_notes'), // staff notes
  source: text('source').default('web'), // web, api, admin, import, chatbot, whatsapp

  // Hold system (NEW)
  customerTimezone: text('customer_timezone'), // e.g., 'Europe/Berlin'
  idempotencyKey: text('idempotency_key'), // Unique for retry protection
  holdId: uuid('hold_id').references(() => bookingHolds.id, { onDelete: 'set null' }), // Optional FK to hold (if created from hold)

  // Line items (for Lieferschein / delivery notes)
  items: jsonb('items').$type<InvoiceLineItem[]>(),
  lieferscheinR2Key: text('lieferschein_r2_key'),

  customFields: jsonb('custom_fields').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancellationReason: text('cancellation_reason'),
  cancelledBy: text('cancelled_by'), // 'customer', 'staff', 'system'
}, (table) => ({
  businessDateIdx: index('bookings_business_date_idx').on(table.businessId, table.startsAt),
  staffDateIdx: index('bookings_staff_date_idx').on(table.staffId, table.startsAt),
  statusIdx: index('bookings_status_idx').on(table.status),
  tokenIdx: index('bookings_token_idx').on(table.confirmationToken),
  idempotencyKeyIdx: uniqueIndex('bookings_idempotency_key_idx').on(table.businessId, table.idempotencyKey),
  holdIdIdx: uniqueIndex('bookings_hold_id_idx').on(table.holdId),
  endsAfterStartsCheck: check('bookings_ends_after_starts', sql`${table.endsAt} > ${table.startsAt}`),
}));

// ============================================
// BOOKING HOLDS (NEW - Prevents Double-Bookings)
// ============================================

export const bookingHolds = pgTable('booking_holds', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id),
  staffId: uuid('staff_id').references(() => staff.id),
  customerId: uuid('customer_id').references(() => customers.id),

  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), // 5 min default

  // NEW: Customer timezone for showing correct local time
  customerTimezone: text('customer_timezone'),

  // NEW: Idempotency key to prevent duplicate holds (WhatsApp retries, etc.)
  idempotencyKey: text('idempotency_key'),

  createdBy: text('created_by').notNull().default('web'), // 'web', 'chatbot', 'admin', 'whatsapp'
  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  businessIdIdx: index('booking_holds_business_id_idx').on(table.businessId),
  expiresAtIdx: index('booking_holds_expires_at_idx').on(table.expiresAt),
  startsAtIdx: index('booking_holds_starts_at_idx').on(table.startsAt),
  idempotencyKeyIdx: uniqueIndex('booking_holds_idempotency_key_idx').on(table.businessId, table.idempotencyKey),
  endsAfterStartsCheck: check('booking_holds_ends_after_starts', sql`${table.endsAt} > ${table.startsAt}`),
}));

// ============================================
// BOOKING ACTIONS (Audit Log)
// ============================================

export const bookingActions = pgTable('booking_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'cascade' }),
  action: text('action').notNull(), // 'created', 'confirmed', 'cancelled', 'rescheduled', etc.
  actorType: text('actor_type'), // 'customer', 'staff', 'system', 'chatbot'
  actorId: text('actor_id'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  bookingIdIdx: index('booking_actions_booking_id_idx').on(table.bookingId),
  actionIdx: index('booking_actions_action_idx').on(table.action),
}));

// ============================================
// WEBSITE BUILDER
// ============================================

export type TemplateId = 'dark-luxury' | 'brutalism' | 'glassmorphism' | 'cyberpunk' | 'editorial' | 'neo-minimal'

export interface WebsiteSectionContent {
  hero: {
    headline: string
    subheadline: string
    ctaText: string
    ctaLink: string
  }
  about: {
    title: string
    description: string
    stats: { label: string; value: string }[]
  }
  services: {
    title: string
    subtitle: string
    items: {
      id: string
      name: string
      description: string
      price: string | null
      duration: string
    }[]
  }
  team: {
    title: string
    subtitle: string
    members: {
      id: string
      name: string
      title: string
      bio: string
      avatarUrl: string | null
    }[]
  }
  testimonials: {
    title: string
    subtitle: string
    items: { name: string; text: string; rating: number }[]
  }
  howItWorks: {
    title: string
    subtitle: string
    steps: { step: string; title: string; description: string }[]
  }
  benefits: {
    title: string
    subtitle: string
    items: { title: string; description: string }[]
  }
  faq: {
    title: string
    subtitle: string
    items: { question: string; answer: string }[]
  }
  contact: {
    title: string
    subtitle: string
    phone: string | null
    email: string | null
    address: string | null
    socialLinks: { platform: string; url: string }[]
  }
  bookingCta: {
    headline: string
    description: string
    ctaText: string
    ctaLink: string
  }
  footer: {
    copyrightText: string
    legalName: string | null
    legalForm: string | null
    registrationNumber: string | null
    registrationCourt: string | null
  }
}

export const businessWebsites = pgTable('business_websites', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  templateId: text('template_id').notNull().$type<TemplateId>(),
  sections: jsonb('sections').$type<WebsiteSectionContent>(),
  isPublished: boolean('is_published').default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  lastGeneratedAt: timestamp('last_generated_at', { withTimezone: true }),
  generationModel: text('generation_model'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  businessIdx: uniqueIndex('business_websites_business_idx').on(table.businessId),
}));

// ============================================
// RELATIONS
// ============================================

export const businessesRelations = relations(businesses, ({ many, one }) => ({
  members: many(businessMembers),
  events: many(eventOutbox),
  services: many(services),
  staff: many(staff),
  customers: many(customers),
  bookings: many(bookings),
  bookingHolds: many(bookingHolds),
  bookingActions: many(bookingActions),
  availabilityTemplates: many(availabilityTemplates),
  availabilityOverrides: many(availabilityOverrides),
  chatbotConversations: many(chatbotConversations),
  chatbotKnowledge: many(chatbotKnowledge),
  supportTickets: many(supportTickets),
  invoices: many(invoices),
  aiUsageLogs: many(aiUsageLog),
  website: one(businessWebsites, {
    fields: [businesses.id],
    references: [businessWebsites.businessId],
  }),
}));

export const businessWebsitesRelations = relations(businessWebsites, ({ one }) => ({
  business: one(businesses, {
    fields: [businessWebsites.businessId],
    references: [businesses.id],
  }),
}));

export const businessMembersRelations = relations(businessMembers, ({ one }) => ({
  business: one(businesses, {
    fields: [businessMembers.businessId],
    references: [businesses.id],
  }),
  inviter: one(businessMembers, {
    fields: [businessMembers.invitedBy],
    references: [businessMembers.id],
  }),
}));

export const eventOutboxRelations = relations(eventOutbox, ({ one }) => ({
  business: one(businesses, {
    fields: [eventOutbox.businessId],
    references: [businesses.id],
  }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  business: one(businesses, {
    fields: [services.businessId],
    references: [businesses.id],
  }),
  staffServices: many(staffServices),
  bookings: many(bookings),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  business: one(businesses, {
    fields: [staff.businessId],
    references: [businesses.id],
  }),
  staffServices: many(staffServices),
  bookings: many(bookings),
  availabilityTemplates: many(availabilityTemplates),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  business: one(businesses, {
    fields: [customers.businessId],
    references: [businesses.id],
  }),
  bookings: many(bookings),
  chatbotConversations: many(chatbotConversations),
  supportTickets: many(supportTickets),
  invoices: many(invoices),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  business: one(businesses, {
    fields: [bookings.businessId],
    references: [businesses.id],
  }),
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id],
  }),
  staff: one(staff, {
    fields: [bookings.staffId],
    references: [staff.id],
  }),
  customer: one(customers, {
    fields: [bookings.customerId],
    references: [customers.id],
  }),
  actions: many(bookingActions),
}));

export const bookingHoldsRelations = relations(bookingHolds, ({ one }) => ({
  business: one(businesses, {
    fields: [bookingHolds.businessId],
    references: [businesses.id],
  }),
  service: one(services, {
    fields: [bookingHolds.serviceId],
    references: [services.id],
  }),
  staff: one(staff, {
    fields: [bookingHolds.staffId],
    references: [staff.id],
  }),
  customer: one(customers, {
    fields: [bookingHolds.customerId],
    references: [customers.id],
  }),
}));

export const bookingActionsRelations = relations(bookingActions, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingActions.bookingId],
    references: [bookings.id],
  }),
}));

// ============================================
// CHATBOT MODULE
// ============================================

// Type definition for conversation intent state (booking flow state machine)
export interface ConversationIntent {
  state: 'idle' | 'browsing_services' | 'checking_availability' |
         'hold_active' | 'collecting_details' | 'awaiting_confirmation'
  serviceId?: string
  serviceName?: string
  holdId?: string
  holdExpiresAt?: string
  selectedDate?: string
  selectedSlot?: {
    start: string
    staffId?: string
    staffName?: string
  }
  customerData?: {
    name?: string
    email?: string
    phone?: string
  }
  lastUpdated: string
}

export const chatbotConversations = pgTable('chatbot_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id),

  // Channel: whatsapp, web, sms
  channel: text('channel').notNull().default('web'),

  // External IDs (e.g., WhatsApp conversation ID)
  externalId: text('external_id'),

  // Status: active, escalated, closed
  status: text('status').notNull().default('active'),

  // Metadata (AI model used, tokens, etc.)
  metadata: jsonb('metadata').default({}),

  // ============================================
  // CONVERSATION MEMORY (Token Optimization)
  // ============================================

  // Rolling summary of conversation (generated after every N messages)
  summary: text('summary'),
  summaryUpdatedAt: timestamp('summary_updated_at', { withTimezone: true }),
  messagesSinceSummary: integer('messages_since_summary').default(0),

  // Intent state machine (persists booking flow state for WhatsApp reconnects)
  currentIntent: jsonb('current_intent').$type<ConversationIntent>().default({
    state: 'idle',
    lastUpdated: new Date().toISOString(),
  }),

  // Data Retention (GDPR Compliance)
  retentionDays: integer('retention_days').default(90), // Auto-delete after X days
  markedForDeletionAt: timestamp('marked_for_deletion_at', { withTimezone: true }), // Scheduled deletion

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
}, (table) => ({
  businessIdx: index('chatbot_conversations_business_idx').on(table.businessId),
  customerIdx: index('chatbot_conversations_customer_idx').on(table.customerId),
  channelIdx: index('chatbot_conversations_channel_idx').on(table.channel),
  statusIdx: index('chatbot_conversations_status_idx').on(table.status),
}));

export const chatbotMessages = pgTable('chatbot_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => chatbotConversations.id, { onDelete: 'cascade' }),

  // Role: user, assistant, system, owner
  role: text('role').notNull(),

  // Message content
  content: text('content').notNull(),

  // Metadata (AI model, tokens, intent, confidence, etc.)
  metadata: jsonb('metadata').default({}),

  // Decision Traceability (EU AI Act Compliance)
  decisionMetadata: jsonb('decision_metadata').$type<{
    reasoning?: string
    confidenceScore?: number
    fallbackTriggered?: boolean
    toolsUsed?: string[]
    modelName?: string
    promptTokens?: number
    completionTokens?: number
  }>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  conversationIdx: index('chatbot_messages_conversation_idx').on(table.conversationId),
  conversationCreatedIdx: index('chatbot_messages_conversation_created_idx').on(table.conversationId, table.createdAt),
  roleIdx: index('chatbot_messages_role_idx').on(table.role),
}));

export const chatbotKnowledge = pgTable('chatbot_knowledge', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),

  // Source: website, chat_history, manual, document
  source: text('source').notNull().default('manual'),

  // Content (text to be used for RAG)
  content: text('content').notNull(),

  // Title/summary
  title: text('title'),

  // Category (faqs, services, policies, etc.)
  category: text('category'),

  // Metadata (URL, document name, embedding vector ID, etc.)
  metadata: jsonb('metadata').default({}),

  // Embedding vector for semantic search (1536 dimensions for text-embedding-3-small)
  embedding: vector('embedding', { dimensions: 1536 }),

  // ============================================
  // EMBEDDING PROVENANCE (Split Brain Prevention)
  // ============================================
  // Full embedding metadata for compatibility filtering
  embeddingProvider: text('embedding_provider'),    // 'openrouter' | 'openai'
  embeddingModel: text('embedding_model'),          // 'openai/text-embedding-3-small'
  embeddingDim: integer('embedding_dim'),           // 1536
  preprocessVersion: text('preprocess_version'),   // 'p1', 'p2', etc. ('legacy' for old entries)
  contentHash: text('content_hash'),               // sha256 of normalized text
  embeddedAt: timestamp('embedded_at', { withTimezone: true }), // when embedding was generated

  // Authority level for weighting (canonical > high > normal > low > unverified)
  authorityLevel: text('authority_level').default('normal'),

  isActive: boolean('is_active').default(true),

  // Link to source document (for traceability - EU AI Act compliance)
  sourceDocumentId: uuid('source_document_id').references(() => documents.id, { onDelete: 'set null' }),

  // Access control (Phase 1: Business Logic Separation)
  // audience: 'public' = safe for customer bot, 'internal' = staff/owner only
  audience: text('audience').notNull().default('public'),
  // scopeType: 'global' = everyone in business, 'customer' = specific customer, 'staff' = specific staff
  scopeType: text('scope_type').notNull().default('global'),
  // scopeId: Required when scopeType != 'global' (customerId or staffId)
  scopeId: uuid('scope_id'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  businessIdx: index('chatbot_knowledge_business_idx').on(table.businessId),
  businessActiveIdx: index('chatbot_knowledge_business_active_idx').on(table.businessId, table.isActive),
  sourceIdx: index('chatbot_knowledge_source_idx').on(table.source),
  categoryIdx: index('chatbot_knowledge_category_idx').on(table.category),
  embeddingIdx: index('chatbot_knowledge_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  // Index for access control filtering
  audienceScopeIdx: index('chatbot_knowledge_audience_scope_idx').on(table.businessId, table.audience, table.scopeType, table.scopeId),
  // Index for document traceability
  sourceDocumentIdx: index('chatbot_knowledge_source_document_idx').on(table.sourceDocumentId),
  // Index for embedding compatibility filtering
  preprocessVersionIdx: index('chatbot_knowledge_preprocess_version_idx').on(table.preprocessVersion),
}));

// ============================================
// SCRAPED PAGES (for chatbot fallback search)
// ============================================

export const scrapedPages = pgTable('scraped_pages', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),

  // Scrape job metadata
  scrapeJobId: text('scrape_job_id').notNull(),
  scrapedAt: timestamp('scraped_at', { withTimezone: true }).notNull().defaultNow(),

  // Page data
  url: text('url').notNull(),
  title: text('title'),
  markdown: text('markdown').notNull(),

  // Metadata
  wordCount: integer('word_count'),
  contentHash: text('content_hash'),

  // Lifecycle
  isActive: boolean('is_active').default(true).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),  // Auto-delete after 90 days

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  businessIdx: index('scraped_pages_business_idx').on(table.businessId),
  scrapeJobIdx: index('scraped_pages_scrape_job_idx').on(table.scrapeJobId),
  urlIdx: index('scraped_pages_url_idx').on(table.url),
}));

export const scrapedPagesRelations = relations(scrapedPages, ({ one }) => ({
  business: one(businesses, {
    fields: [scrapedPages.businessId],
    references: [businesses.id],
  }),
}));

// ============================================
// SUPPORT TICKETS MODULE
// ============================================

export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').references(() => chatbotConversations.id),
  customerId: uuid('customer_id').references(() => customers.id),

  // Ticket details
  subject: text('subject').notNull(),
  description: text('description'),

  // Status: open, in_progress, resolved, closed
  status: text('status').notNull().default('open'),

  // Priority: low, medium, high, urgent
  priority: text('priority').notNull().default('medium'),

  // Assignment
  assignedTo: uuid('assigned_to'), // Can reference businessMembers or staff

  // Metadata
  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
}, (table) => ({
  businessIdx: index('support_tickets_business_idx').on(table.businessId),
  customerIdx: index('support_tickets_customer_idx').on(table.customerId),
  statusIdx: index('support_tickets_status_idx').on(table.status),
  assignedIdx: index('support_tickets_assigned_idx').on(table.assignedTo),
}));

export const ticketComments = pgTable('ticket_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: uuid('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),

  // Author (can be customer, staff, or system)
  authorType: text('author_type').notNull(), // customer, staff, system
  authorId: uuid('author_id'), // customerId or memberId

  content: text('content').notNull(),

  // Attachments
  attachments: jsonb('attachments').default([]),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  ticketIdx: index('ticket_comments_ticket_idx').on(table.ticketId),
}));

// ============================================
// INVOICING MODULE (German § 14 UStG Compliant)
// ============================================

// Type definition for invoice line items
export interface InvoiceLineItem {
  description: string
  quantity: number
  unitPrice: string  // Decimal as string
  total: string      // Decimal as string
}

// Type definition for business tax settings
export interface BusinessTaxSettings {
  taxId?: string           // Steuernummer or USt-IdNr
  taxRate?: number         // Default: 19 (can be 19, 7, or 0)
  isKleinunternehmer?: boolean  // If true, no MwSt charged (§ 19 UStG)
  showLogoOnInvoice?: boolean   // If true, display logo on invoices (default: true)
}

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  bookingId: uuid('booking_id').references(() => bookings.id), // Optional link to booking
  customerId: uuid('customer_id').references(() => customers.id),

  // Invoice details
  invoiceNumber: text('invoice_number').notNull(), // Format: RE-2026-00001 (unique per business)

  // Line items
  items: jsonb('items').notNull().$type<InvoiceLineItem[]>(), // [{ description, quantity, unitPrice, total }]

  // Amounts (German invoice requirements)
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),  // Nettobetrag
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('19.00'),  // MwSt rate (19%, 7%, or 0%)
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0'), // MwSt amount
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),  // Bruttobetrag

  // Currency
  currency: text('currency').default('EUR'),

  // Status: draft, sent, paid, overdue, cancelled
  status: text('status').notNull().default('draft'),

  // Invoice type: 'invoice' (normal) or 'storno' (credit note / Stornorechnung)
  type: text('type').notNull().default('invoice'),

  // Storno chain references
  originalInvoiceId: uuid('original_invoice_id'),   // storno → points to cancelled invoice
  stornoInvoiceId: uuid('storno_invoice_id'),        // cancelled invoice → points to its storno
  replacementInvoiceId: uuid('replacement_invoice_id'), // cancelled → points to replacement draft

  // Cancellation
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),

  // Dates (German invoice requirements)
  issueDate: date('issue_date').notNull(),  // Ausstellungsdatum
  serviceDate: date('service_date'),         // Leistungsdatum (from booking.startsAt)
  dueDate: date('due_date').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),

  // Payment tracking
  paymentMethod: text('payment_method'), // cash, card, transfer, etc.
  paymentReference: text('payment_reference'),

  // PDF storage (R2)
  pdfR2Key: text('pdf_r2_key'),  // R2 storage key for generated PDF

  // Notes
  notes: text('notes'),
  internalNotes: text('internal_notes'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  businessIdx: index('invoices_business_idx').on(table.businessId),
  customerIdx: index('invoices_customer_idx').on(table.customerId),
  bookingIdx: index('invoices_booking_idx').on(table.bookingId),
  statusIdx: index('invoices_status_idx').on(table.status),
  invoiceNumberIdx: uniqueIndex('invoices_invoice_number_idx').on(table.businessId, table.invoiceNumber),
  businessStatusDateIdx: index('invoices_business_status_date_idx').on(table.businessId, table.status, table.issueDate),
}));

// Invoice number sequence tracking (per business, per year)
export const invoiceSequences = pgTable('invoice_sequences', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  lastNumber: integer('last_number').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  businessYearIdx: uniqueIndex('invoice_sequences_business_year_idx').on(table.businessId, table.year),
}));

// ============================================
// DOCUMENT EVENTS (Audit Trail)
// ============================================

export const documentEvents = pgTable('document_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }),
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'cascade' }),
  documentType: text('document_type').notNull(),  // 'invoice' | 'storno' | 'lieferschein'
  action: text('action').notNull(),               // 'created' | 'regenerated' | 'sent' | 'marked_paid' | 'cancelled' | 'storno_created'
  actorType: text('actor_type').notNull().default('staff'),
  actorId: text('actor_id'),                      // Clerk userId
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  businessIdx: index('document_events_business_idx').on(table.businessId),
  invoiceIdx: index('document_events_invoice_idx').on(table.invoiceId),
  bookingIdx: index('document_events_booking_idx').on(table.bookingId),
}));

export const documentEventsRelations = relations(documentEvents, ({ one }) => ({
  business: one(businesses, {
    fields: [documentEvents.businessId],
    references: [businesses.id],
  }),
  invoice: one(invoices, {
    fields: [documentEvents.invoiceId],
    references: [invoices.id],
  }),
  booking: one(bookings, {
    fields: [documentEvents.bookingId],
    references: [bookings.id],
  }),
}));

// ============================================
// RELATIONS (Extended)
// ============================================

export const chatbotConversationsRelations = relations(chatbotConversations, ({ one, many }) => ({
  business: one(businesses, {
    fields: [chatbotConversations.businessId],
    references: [businesses.id],
  }),
  customer: one(customers, {
    fields: [chatbotConversations.customerId],
    references: [customers.id],
  }),
  messages: many(chatbotMessages),
  supportTickets: many(supportTickets),
}));

export const chatbotMessagesRelations = relations(chatbotMessages, ({ one }) => ({
  conversation: one(chatbotConversations, {
    fields: [chatbotMessages.conversationId],
    references: [chatbotConversations.id],
  }),
}));

export const chatbotKnowledgeRelations = relations(chatbotKnowledge, ({ one }) => ({
  business: one(businesses, {
    fields: [chatbotKnowledge.businessId],
    references: [businesses.id],
  }),
  sourceDocument: one(documents, {
    fields: [chatbotKnowledge.sourceDocumentId],
    references: [documents.id],
  }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  business: one(businesses, {
    fields: [supportTickets.businessId],
    references: [businesses.id],
  }),
  customer: one(customers, {
    fields: [supportTickets.customerId],
    references: [customers.id],
  }),
  conversation: one(chatbotConversations, {
    fields: [supportTickets.conversationId],
    references: [chatbotConversations.id],
  }),
  comments: many(ticketComments),
}));

export const ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [ticketComments.ticketId],
    references: [supportTickets.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  business: one(businesses, {
    fields: [invoices.businessId],
    references: [businesses.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  booking: one(bookings, {
    fields: [invoices.bookingId],
    references: [bookings.id],
  }),
}));

// ============================================
// DOCUMENT INGESTION MODULE (PDF Connector)
// ============================================

/**
 * Logical document record
 * Tracks a document's lifecycle and metadata
 */
export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),

  // Document metadata
  title: text('title').notNull(),
  originalFilename: text('original_filename').notNull(),

  // Status: active, deleted_pending, deleted
  status: text('status').notNull().default('active'),

  // Who uploaded this document
  uploadedBy: text('uploaded_by'), // clerkUserId

  // Labels for organization (optional)
  labels: jsonb('labels').default([]),

  // Access control (Phase 1: Business Logic Separation)
  // audience: 'public' = safe for customer bot, 'internal' = staff/owner only
  audience: text('audience').notNull().default('public'),
  // scopeType: 'global' = everyone in business, 'customer' = specific customer, 'staff' = specific staff
  scopeType: text('scope_type').notNull().default('global'),
  // scopeId: Required when scopeType != 'global' (customerId or staffId)
  scopeId: uuid('scope_id'),
  // dataClass: 'knowledge' = index for RAG, 'stored_only' = store but don't embed
  dataClass: text('data_class').notNull().default('knowledge'),
  // containsPii: True for CSV/log imports with potential sensitive data
  containsPii: boolean('contains_pii').default(false),

  // Authority level for weighting (canonical > high > normal > low > unverified)
  authorityLevel: text('authority_level').default('normal'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  businessIdx: index('documents_business_idx').on(table.businessId),
  statusIdx: index('documents_status_idx').on(table.status),
  audienceScopeIdx: index('documents_audience_scope_idx').on(table.businessId, table.audience, table.scopeType, table.scopeId),
  businessStatusCreatedIdx: index('documents_business_status_created_idx').on(table.businessId, table.status, table.createdAt),
}));

/**
 * Physical file version in R2
 * Supports versioning - never overwrite PDFs
 */
export const documentVersions = pgTable('document_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),

  // Version number (starts at 1)
  version: integer('version').notNull().default(1),

  // R2 storage key
  r2Key: text('r2_key').notNull(),

  // File metadata
  fileSize: integer('file_size'), // in bytes
  mimeType: text('mime_type').default('application/pdf'),

  // Deduplication via content hash
  sha256Hash: text('sha256_hash'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  documentIdx: index('document_versions_document_idx').on(table.documentId),
  // Unique version per document
  versionIdx: uniqueIndex('document_versions_version_idx').on(table.documentId, table.version),
  // Unique R2 key
  r2KeyIdx: uniqueIndex('document_versions_r2_key_idx').on(table.r2Key),
}));

/**
 * Processing job state machine
 * Tracks extraction, chunking, and embedding pipeline
 * Supports both PDF documents and URL scraping
 */
export const ingestionJobs = pgTable('ingestion_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Nullable for URL jobs that don't have a document
  documentVersionId: uuid('document_version_id').references(() => documentVersions.id, { onDelete: 'cascade' }),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),

  // Source type for parser router: 'pdf' | 'url'
  sourceType: text('source_type').notNull().default('pdf'),

  // URL scraping fields (null for PDF jobs)
  sourceUrl: text('source_url'),
  discoveredUrls: jsonb('discovered_urls').default([]),
  scrapeConfig: jsonb('scrape_config').default({}),
  extractServices: boolean('extract_services').default(false),

  // Status: queued, processing, done, failed, retry_ready
  // (Simplified - use 'stage' for progress, 'errorCode' for failure reason)
  status: text('status').notNull().default('queued'),

  // Current processing stage (for progress):
  // PDF: uploaded, parsing, chunking, embedding, cleanup
  // URL: discovering, scraping, chunking, embedding, extracting
  stage: text('stage'),

  // Error classification (why it failed): extraction_empty, needs_ocr, parse_failed, scrape_failed, etc.
  errorCode: text('error_code'),

  // Retry logic
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  lastError: text('last_error'),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),

  // Timing
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),

  // Pipeline metadata (parser version, chunker version, model, timings)
  metrics: jsonb('metrics').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  versionIdx: index('ingestion_jobs_version_idx').on(table.documentVersionId),
  businessIdx: index('ingestion_jobs_business_idx').on(table.businessId),
  statusIdx: index('ingestion_jobs_status_idx').on(table.status),
  // For job claim query (status + retry)
  claimIdx: index('ingestion_jobs_claim_idx').on(table.status, table.nextRetryAt),
  // For URL jobs lookup
  sourceUrlIdx: index('ingestion_jobs_source_url_idx').on(table.sourceUrl),
}));

/**
 * Per-page extracted text
 * For citations and page-level references
 */
export const documentPages = pgTable('document_pages', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentVersionId: uuid('document_version_id').notNull().references(() => documentVersions.id, { onDelete: 'cascade' }),

  // Page number (1-indexed)
  pageNumber: integer('page_number').notNull(),

  // Extracted text content
  content: text('content').notNull(),

  // Page metadata (word count, etc.)
  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  versionIdx: index('document_pages_version_idx').on(table.documentVersionId),
  pageIdx: uniqueIndex('document_pages_page_idx').on(table.documentVersionId, table.pageNumber),
}));

/**
 * Text chunks with provenance
 * NO embedding here - kept separate for clean indexing
 */
export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentVersionId: uuid('document_version_id').notNull().references(() => documentVersions.id, { onDelete: 'cascade' }),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),

  // Position in document
  chunkIndex: integer('chunk_index').notNull(),

  // Chunk content
  content: text('content').notNull(),

  // Page provenance for citations
  pageStart: integer('page_start').notNull(),
  pageEnd: integer('page_end').notNull(),

  // Chunk metadata (heading, section, etc.)
  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  versionIdx: index('document_chunks_version_idx').on(table.documentVersionId),
  businessIdx: index('document_chunks_business_idx').on(table.businessId),
  // Unique chunk per version
  chunkIdx: uniqueIndex('document_chunks_chunk_idx').on(table.documentVersionId, table.chunkIndex),
}));

/**
 * Chunk embeddings
 * Separate table for clean HNSW indexing
 */
export const chunkEmbeddings = pgTable('chunk_embeddings', {
  chunkId: uuid('chunk_id').primaryKey().references(() => documentChunks.id, { onDelete: 'cascade' }),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),

  // Embedding vector (1536 dimensions for text-embedding-3-small)
  embedding: vector('embedding', { dimensions: 1536 }).notNull(),

  // ============================================
  // EMBEDDING PROVENANCE (Split Brain Prevention)
  // ============================================
  // Full embedding metadata for compatibility filtering
  embeddingProvider: text('embedding_provider'),    // 'openrouter' | 'openai'
  embeddingModel: text('embedding_model'),          // 'openai/text-embedding-3-small'
  embeddingDim: integer('embedding_dim'),           // 1536
  preprocessVersion: text('preprocess_version'),   // 'p1', 'p2', etc. ('legacy' for old entries)
  contentHash: text('content_hash'),               // sha256 of normalized text
  embeddedAt: timestamp('embedded_at', { withTimezone: true }), // when embedding was generated

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  businessIdx: index('chunk_embeddings_business_idx').on(table.businessId),
  embeddingIdx: index('chunk_embeddings_hnsw').using('hnsw', table.embedding.op('vector_cosine_ops')),
  // Index for embedding compatibility filtering
  preprocessVersionIdx: index('chunk_embeddings_preprocess_version_idx').on(table.preprocessVersion),
}));

// ============================================
// DOCUMENT RELATIONS
// ============================================

export const documentsRelations = relations(documents, ({ one, many }) => ({
  business: one(businesses, {
    fields: [documents.businessId],
    references: [businesses.id],
  }),
  versions: many(documentVersions),
}));

export const documentVersionsRelations = relations(documentVersions, ({ one, many }) => ({
  document: one(documents, {
    fields: [documentVersions.documentId],
    references: [documents.id],
  }),
  jobs: many(ingestionJobs),
  pages: many(documentPages),
  chunks: many(documentChunks),
}));

export const ingestionJobsRelations = relations(ingestionJobs, ({ one }) => ({
  documentVersion: one(documentVersions, {
    fields: [ingestionJobs.documentVersionId],
    references: [documentVersions.id],
  }),
  business: one(businesses, {
    fields: [ingestionJobs.businessId],
    references: [businesses.id],
  }),
}));

export const documentPagesRelations = relations(documentPages, ({ one }) => ({
  documentVersion: one(documentVersions, {
    fields: [documentPages.documentVersionId],
    references: [documentVersions.id],
  }),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  documentVersion: one(documentVersions, {
    fields: [documentChunks.documentVersionId],
    references: [documentVersions.id],
  }),
  business: one(businesses, {
    fields: [documentChunks.businessId],
    references: [businesses.id],
  }),
  embedding: one(chunkEmbeddings, {
    fields: [documentChunks.id],
    references: [chunkEmbeddings.chunkId],
  }),
}));

export const chunkEmbeddingsRelations = relations(chunkEmbeddings, ({ one }) => ({
  chunk: one(documentChunks, {
    fields: [chunkEmbeddings.chunkId],
    references: [documentChunks.id],
  }),
  business: one(businesses, {
    fields: [chunkEmbeddings.businessId],
    references: [businesses.id],
  }),
}));

// ============================================
// AI USAGE LOG
// ============================================

export const aiUsageLog = pgTable('ai_usage_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  channel: text('channel').notNull(), // 'chatbot', 'embedding', 'website_gen', 'knowledge_extraction', 'voice', 'whatsapp_transcription', 'post_gen'
  model: text('model').notNull(), // e.g. 'openai/gpt-4o', 'google/gemini-2.5-flash'
  promptTokens: integer('prompt_tokens').default(0),
  completionTokens: integer('completion_tokens').default(0),
  totalTokens: integer('total_tokens').default(0),
  estimatedCostCents: integer('estimated_cost_cents').default(0), // in cents for precision
  metadata: jsonb('metadata').default({}), // extra context
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  businessIdx: index('ai_usage_log_business_idx').on(table.businessId),
  businessCreatedIdx: index('ai_usage_log_business_created_idx').on(table.businessId, table.createdAt),
  channelIdx: index('ai_usage_log_channel_idx').on(table.channel),
}));

// ============================================
// GDPR DELETION REQUESTS
// ============================================

export const deletionRequests = pgTable('deletion_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  customerEmail: text('customer_email').notNull(),
  token: text('token').notNull().unique(),

  // Status: pending (email sent), confirmed (customer clicked link), completed (data deleted), expired
  status: text('status').notNull().default('pending'),

  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => ({
  tokenIdx: uniqueIndex('deletion_requests_token_idx').on(table.token),
  businessIdx: index('deletion_requests_business_idx').on(table.businessId),
  customerIdx: index('deletion_requests_customer_idx').on(table.customerId),
  statusIdx: index('deletion_requests_status_idx').on(table.status),
}));

export const aiUsageLogRelations = relations(aiUsageLog, ({ one }) => ({
  business: one(businesses, {
    fields: [aiUsageLog.businessId],
    references: [businesses.id],
  }),
}));

export const deletionRequestsRelations = relations(deletionRequests, ({ one }) => ({
  business: one(businesses, {
    fields: [deletionRequests.businessId],
    references: [businesses.id],
  }),
  customer: one(customers, {
    fields: [deletionRequests.customerId],
    references: [customers.id],
  }),
}));
