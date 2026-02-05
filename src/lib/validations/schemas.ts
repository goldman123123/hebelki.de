import { z } from 'zod'

// ============================================
// SERVICE SCHEMA
// ============================================

export const serviceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  durationMinutes: z.number().min(5, 'Duration must be at least 5 minutes').max(480, 'Duration cannot exceed 8 hours'),
  bufferMinutes: z.number().min(0).max(60).default(0),
  price: z.string().regex(/^(\d+(\.\d{1,2})?)?$/, 'Invalid price format').optional().nullable(),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(100, 'Capacity cannot exceed 100').default(1),
  isActive: z.boolean().default(true),
})

export type ServiceFormData = z.infer<typeof serviceSchema>

// ============================================
// STAFF SCHEMA
// ============================================

export const staffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  phone: z.string().max(20).optional().nullable(),
  title: z.string().max(100).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  isActive: z.boolean().default(true),
  serviceIds: z.array(z.string().uuid()).optional().default([]),
})

export type StaffFormData = z.infer<typeof staffSchema>

// ============================================
// BOOKING STATUS SCHEMA
// ============================================

export const bookingStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']),
  cancellationReason: z.string().max(500).optional().nullable(),
  cancelledBy: z.enum(['customer', 'staff', 'system']).optional().nullable(),
  internalNotes: z.string().max(1000).optional().nullable(),
})

export type BookingStatusFormData = z.infer<typeof bookingStatusSchema>

// ============================================
// AVAILABILITY TEMPLATE SCHEMA
// ============================================

export const timeSlotSchema = z.object({
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
}).refine(data => data.startTime < data.endTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
})

export const weeklyScheduleSchema = z.object({
  0: z.array(timeSlotSchema).optional().default([]), // Sunday
  1: z.array(timeSlotSchema).optional().default([]), // Monday
  2: z.array(timeSlotSchema).optional().default([]), // Tuesday
  3: z.array(timeSlotSchema).optional().default([]), // Wednesday
  4: z.array(timeSlotSchema).optional().default([]), // Thursday
  5: z.array(timeSlotSchema).optional().default([]), // Friday
  6: z.array(timeSlotSchema).optional().default([]), // Saturday
})

export type WeeklySchedule = z.infer<typeof weeklyScheduleSchema>

// ============================================
// AVAILABILITY OVERRIDE SCHEMA
// ============================================

export const availabilityOverrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  isAvailable: z.boolean(),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
  reason: z.string().max(200).optional().nullable(),
  staffId: z.string().uuid().optional().nullable(),
}).refine(data => {
  // If available with custom hours, both times required
  if (data.isAvailable && (data.startTime || data.endTime)) {
    return data.startTime && data.endTime && data.startTime < data.endTime
  }
  return true
}, {
  message: 'Both start and end times required when setting custom hours',
  path: ['endTime'],
})

export type AvailabilityOverrideFormData = z.infer<typeof availabilityOverrideSchema>
