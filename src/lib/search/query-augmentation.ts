/**
 * Query Augmentation for Improved Search
 *
 * Expands user queries with:
 * - German ↔ English translations
 * - Synonyms and related terms
 * - Common variations
 *
 * This improves search accuracy, especially for multilingual content.
 */

export interface AugmentedQuery {
  original: string
  augmented: string[]
  translations: string[]
  synonyms: string[]
}

/**
 * German-English term mappings for common business queries
 * Pattern: "german_regex" -> ["english", "terms"]
 */
const germanEnglishMappings: Record<string, string[]> = {
  // Qualifications & Certifications
  'zertifikat|zertifiziert|zertifizierung': [
    'certificate',
    'certified',
    'certification',
    'qualifications',
    'accredited',
    'accreditation',
  ],

  // Pricing & Costs
  'preis|preise|kosten|gebühr|gebühren': [
    'price',
    'pricing',
    'cost',
    'costs',
    'fee',
    'fees',
    'rate',
    'rates',
  ],

  // Hours & Schedule
  'öffnungszeiten|öffnungszeit|stunden|zeitplan': [
    'hours',
    'opening hours',
    'schedule',
    'availability',
    'open',
    'when open',
  ],

  // Appointments & Bookings
  'termin|termine|buchung|reservierung': [
    'appointment',
    'appointments',
    'booking',
    'bookings',
    'reservation',
    'reservations',
  ],

  // Staff & Team
  'mitarbeiter|team|personal|therapeut|arzt': [
    'staff',
    'team',
    'employee',
    'employees',
    'practitioner',
    'therapist',
    'doctor',
  ],

  // Services & Treatments
  'behandlung|behandlungen|service|dienstleistung|therapie': [
    'treatment',
    'treatments',
    'service',
    'services',
    'therapy',
    'therapies',
  ],

  // Location & Contact
  'standort|adresse|kontakt': [
    'location',
    'address',
    'contact',
    'where',
  ],

  // Payment
  'zahlung|bezahlung|kreditkarte|bar': [
    'payment',
    'pay',
    'credit card',
    'cash',
    'billing',
  ],

  // Cancellation
  'stornierung|absage|kündigung': [
    'cancellation',
    'cancel',
    'refund',
    'policy',
  ],

  // Insurance
  'versicherung|krankenkasse': [
    'insurance',
    'health insurance',
    'coverage',
  ],

  // Experience
  'erfahrung|qualifikation|ausbildung': [
    'experience',
    'qualification',
    'training',
    'education',
  ],

  // Equipment
  'ausstattung|geräte|equipment': [
    'equipment',
    'facilities',
    'tools',
  ],

  // Safety
  'sicherheit|hygiene|steril': [
    'safety',
    'hygiene',
    'sterile',
    'clean',
  ],

  // First visit
  'ersttermin|erstberatung|erstbesuch': [
    'first visit',
    'initial consultation',
    'first appointment',
  ],

  // Duration
  'dauer|zeitdauer|länge': [
    'duration',
    'length',
    'how long',
    'time',
  ],

  // Parking
  'parkplatz|parken': [
    'parking',
    'park',
  ],
}

/**
 * Synonym groups (same language variations)
 */
const synonymGroups: Record<string, string[]> = {
  // Appointment-related
  'appointment': ['appointment', 'booking', 'reservation', 'slot', 'time slot'],
  'termin': ['Termin', 'Buchung', 'Reservierung', 'Zeitfenster'],

  // Price-related
  'price': ['price', 'cost', 'fee', 'rate', 'charge'],
  'preis': ['Preis', 'Kosten', 'Gebühr', 'Tarif'],

  // Staff-related
  'staff': ['staff', 'team', 'practitioner', 'therapist', 'specialist'],
  'mitarbeiter': ['Mitarbeiter', 'Team', 'Therapeut', 'Spezialist'],

  // Treatment-related
  'treatment': ['treatment', 'service', 'therapy', 'procedure'],
  'behandlung': ['Behandlung', 'Service', 'Therapie', 'Verfahren'],
}

/**
 * Augment a search query with translations and synonyms
 */
export function augmentQuery(query: string): AugmentedQuery {
  const normalized = query.toLowerCase().trim()
  const augmented: string[] = [normalized, query] // Include both normalized and original
  const translations: string[] = []
  const synonyms: string[] = []

  // 1. Add German → English translations
  for (const [germanPattern, englishTerms] of Object.entries(germanEnglishMappings)) {
    const germanRegex = new RegExp(germanPattern, 'i')
    if (germanRegex.test(normalized)) {
      translations.push(...englishTerms)
      augmented.push(...englishTerms)
    }
  }

  // 2. Add synonyms for key terms
  for (const [baseTerm, synonymList] of Object.entries(synonymGroups)) {
    if (normalized.includes(baseTerm.toLowerCase())) {
      synonyms.push(...synonymList)
      augmented.push(...synonymList)
    }
  }

  // 3. Add common query variations
  // Example: "Wie viel kostet" → "Preis", "Kosten"
  if (normalized.match(/wie viel|wieviel|was kostet/)) {
    augmented.push('Preis', 'Kosten', 'Gebühr', 'price', 'cost', 'fee')
  }

  if (normalized.match(/wann|öffnungszeiten|geöffnet/)) {
    augmented.push('Öffnungszeiten', 'Stunden', 'hours', 'schedule')
  }

  if (normalized.match(/wo|adresse|standort/)) {
    augmented.push('Adresse', 'Standort', 'address', 'location')
  }

  // 4. Remove duplicates and empty strings
  const uniqueAugmented = Array.from(new Set(augmented.filter(Boolean)))

  return {
    original: query,
    augmented: uniqueAugmented,
    translations: Array.from(new Set(translations)),
    synonyms: Array.from(new Set(synonyms)),
  }
}

/**
 * Check if query augmentation would help
 * Returns true if the query contains German terms that can be translated
 */
export function shouldAugmentQuery(query: string): boolean {
  const normalized = query.toLowerCase()

  for (const germanPattern of Object.keys(germanEnglishMappings)) {
    const regex = new RegExp(germanPattern, 'i')
    if (regex.test(normalized)) {
      return true
    }
  }

  return false
}

/**
 * Get suggested translations for debugging/logging
 */
export function getTranslationSuggestions(query: string): string[] {
  const { translations } = augmentQuery(query)
  return translations
}
