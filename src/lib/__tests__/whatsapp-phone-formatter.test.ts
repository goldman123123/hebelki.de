import { describe, it, expect } from 'vitest'
import {
  formatE164Phone,
  isValidWhatsAppPhone,
  formatTwilioWhatsAppNumber,
} from '../whatsapp-phone-formatter'

describe('formatE164Phone', () => {
  it('returns number with + prefix unchanged', () => {
    expect(formatE164Phone('+5926964488')).toBe('+5926964488')
  })

  it('strips spaces, dashes, and parentheses', () => {
    expect(formatE164Phone('+592 696-4488')).toBe('+5926964488')
    expect(formatE164Phone('+592-696-4488')).toBe('+5926964488')
    expect(formatE164Phone('+49 (170) 1234567')).toBe('+491701234567')
  })

  it('replaces 00 prefix with +', () => {
    expect(formatE164Phone('005926964488')).toBe('+5926964488')
    expect(formatE164Phone('004917012345678')).toBe('+4917012345678')
  })

  it('adds + when missing and number is long (international)', () => {
    expect(formatE164Phone('5926964488123')).toBe('+5926964488123')
  })

  it('handles Guyana local numbers starting with 0', () => {
    // 7-digit number starting with 0 → prepend +592
    expect(formatE164Phone('0696448')).toBe('+592696448')
  })

  it('strips whatsapp: prefix', () => {
    expect(formatE164Phone('whatsapp:+5926964488')).toBe('+5926964488')
    expect(formatE164Phone('WhatsApp:+5926964488')).toBe('+5926964488')
  })
})

describe('isValidWhatsAppPhone', () => {
  it('returns true for valid E.164 numbers', () => {
    expect(isValidWhatsAppPhone('+5926964488')).toBe(true)
    expect(isValidWhatsAppPhone('+4917012345678')).toBe(true)
    expect(isValidWhatsAppPhone('+12125551234')).toBe(true)
  })

  it('returns false for numbers that are too short', () => {
    expect(isValidWhatsAppPhone('+1234')).toBe(false)
  })

  it('returns false for numbers starting with 0 country code', () => {
    expect(isValidWhatsAppPhone('+0123456789')).toBe(false)
  })

  it('validates after formatting', () => {
    // The formatter should clean these up before validation
    expect(isValidWhatsAppPhone('+592 696-4488')).toBe(true)
    expect(isValidWhatsAppPhone('005926964488')).toBe(true)
  })
})

describe('formatTwilioWhatsAppNumber', () => {
  it('prepends whatsapp: to E.164 number', () => {
    expect(formatTwilioWhatsAppNumber('+5926964488')).toBe('whatsapp:+5926964488')
  })

  it('formats and prepends whatsapp: for messy input', () => {
    expect(formatTwilioWhatsAppNumber('592-696-4488')).toBe('whatsapp:5926964488')
    expect(formatTwilioWhatsAppNumber('+49 170 1234567')).toBe('whatsapp:+491701234567')
  })
})
