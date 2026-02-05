export interface ScrapedPage {
  url: string
  markdown: string
  html: string
  metadata?: {
    title?: string
    description?: string
    ogImage?: string
  }
}

export interface KnowledgeEntry {
  title: string
  content: string
  category:
    | 'faq'
    | 'services'
    | 'pricing'
    | 'policies'
    | 'procedures'
    | 'hours'
    | 'location'
    | 'contact'
    | 'team'
    | 'about'
    | 'qualifications'  // ← FIXED: Now supports certifications!
    | 'equipment'
    | 'safety'
    | 'booking'
    | 'testimonials'
    | 'other'
  confidence: number
}

export interface DetectedService {
  name: string
  description?: string
  durationMinutes?: number | null
  price?: number | null
  category?: string
  staffMember?: string
  confidence: number
}
