/**
 * Validation schemas for chatbot-related operations
 */

import { z } from 'zod'

/**
 * Knowledge entry validation schema
 */
export const KnowledgeEntrySchema = z.object({
  businessId: z.string().uuid('Invalid business ID'),
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters'),
  content: z
    .string()
    .min(50, 'Content must be at least 50 characters')
    .max(50000, 'Content must not exceed 50,000 characters'),
  category: z
    .enum([
      'faq',
      'services',
      'pricing',
      'policies',
      'procedures',
      'hours',
      'location',
      'contact',
      'team',
      'about',
      'qualifications',
      'equipment',
      'safety',
      'booking',
      'testimonials',
      'other',
    ])
    .optional()
    .nullable(),
  source: z
    .enum(['manual', 'website', 'document', 'chat_history'])
    .default('manual'),
  confidence: z.number().min(0).max(100).optional(),
})

/**
 * Knowledge entry update schema (all fields optional except ID)
 */
export const KnowledgeUpdateSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters')
    .optional(),
  content: z
    .string()
    .min(50, 'Content must be at least 50 characters')
    .max(50000, 'Content must not exceed 50,000 characters')
    .optional(),
  category: z
    .enum([
      'faq',
      'services',
      'pricing',
      'policies',
      'procedures',
      'hours',
      'location',
      'contact',
      'team',
      'about',
      'qualifications',
      'equipment',
      'safety',
      'booking',
      'testimonials',
      'other',
    ])
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
})

/**
 * Type exports for use in API routes
 */
export type KnowledgeEntryInput = z.infer<typeof KnowledgeEntrySchema>
export type KnowledgeUpdateInput = z.infer<typeof KnowledgeUpdateSchema>
