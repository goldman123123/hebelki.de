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
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

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

  // Branding
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color').default('#3B82F6'),

  // Location
  timezone: text('timezone').notNull().default('Europe/Berlin'),
  currency: text('currency').default('EUR'),

  // Contact
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  website: text('website'),

  // Booking policies
  minBookingNoticeHours: integer('min_booking_notice_hours').default(24),
  maxAdvanceBookingDays: integer('max_advance_booking_days').default(60),
  cancellationPolicyHours: integer('cancellation_policy_hours').default(24),
  allowWaitlist: boolean('allow_waitlist').default(true),
  requireApproval: boolean('require_approval').default(false),

  // Plan & billing
  planId: text('plan_id').default('free'), // free, starter, pro, business
  planStartedAt: timestamp('plan_started_at', { withTimezone: true }),
  planExpiresAt: timestamp('plan_expires_at', { withTimezone: true }),

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

  // Google Calendar integration
  googleCalendarId: text('google_calendar_id'),
  googleRefreshToken: text('google_refresh_token'),

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

  email: text('email').notNull(),
  name: text('name'),
  phone: text('phone'),
  notes: text('notes'), // internal notes

  customFields: jsonb('custom_fields').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  businessEmailIdx: uniqueIndex('customers_business_email_idx').on(table.businessId, table.email),
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

  // Status: pending | confirmed | cancelled | completed | no_show
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
  idempotencyKeyIdx: uniqueIndex('bookings_idempotency_key_idx').on(table.idempotencyKey),
  // NEW: Unique index for holdId (one hold → max one booking)
  holdIdIdx: uniqueIndex('bookings_hold_id_idx').on(table.holdId),
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
  // NEW: Unique index for idempotency (prevents duplicate holds)
  idempotencyKeyIdx: uniqueIndex('booking_holds_idempotency_key_idx').on(table.businessId, table.idempotencyKey),
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
// WAITLIST
// ============================================

export const waitlist = pgTable('waitlist', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id),
  serviceId: uuid('service_id').references(() => services.id),
  staffId: uuid('staff_id').references(() => staff.id), // NULL = any staff

  preferredDates: jsonb('preferred_dates'), // array of date ranges

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  notifiedAt: timestamp('notified_at', { withTimezone: true }),
  convertedBookingId: uuid('converted_booking_id').references(() => bookings.id),
});

// ============================================
// RELATIONS
// ============================================

export const businessesRelations = relations(businesses, ({ many }) => ({
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

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  conversationIdx: index('chatbot_messages_conversation_idx').on(table.conversationId),
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

  isActive: boolean('is_active').default(true),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  businessIdx: index('chatbot_knowledge_business_idx').on(table.businessId),
  sourceIdx: index('chatbot_knowledge_source_idx').on(table.source),
  categoryIdx: index('chatbot_knowledge_category_idx').on(table.category),
  embeddingIdx: index('chatbot_knowledge_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
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
// INVOICING MODULE (Future)
// ============================================

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  bookingId: uuid('booking_id').references(() => bookings.id), // Optional link to booking
  customerId: uuid('customer_id').references(() => customers.id),

  // Invoice details
  invoiceNumber: text('invoice_number').notNull().unique(),

  // Line items
  items: jsonb('items').notNull(), // [{ description, quantity, price, total }]

  // Amounts
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax: decimal('tax', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),

  // Currency
  currency: text('currency').default('EUR'),

  // Status: draft, sent, paid, overdue, cancelled
  status: text('status').notNull().default('draft'),

  // Dates
  issueDate: date('issue_date').notNull(),
  dueDate: date('due_date').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),

  // Payment tracking
  paymentMethod: text('payment_method'), // cash, card, transfer, etc.
  paymentReference: text('payment_reference'),

  // Notes
  notes: text('notes'),
  internalNotes: text('internal_notes'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  businessIdx: index('invoices_business_idx').on(table.businessId),
  customerIdx: index('invoices_customer_idx').on(table.customerId),
  statusIdx: index('invoices_status_idx').on(table.status),
  invoiceNumberIdx: uniqueIndex('invoices_invoice_number_idx').on(table.invoiceNumber),
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
