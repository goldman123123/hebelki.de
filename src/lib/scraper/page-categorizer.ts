/**
 * Page categorizer - assigns categories and priorities to discovered URLs
 * Used for smart defaults in page selection UI
 */

export type PageCategory = 'home' | 'about' | 'services' | 'contact' | 'blog' | 'legal' | 'other'
export type PagePriority = 'high' | 'medium' | 'low'

export interface CategorizedPage {
  url: string
  title: string | null
  category: PageCategory
  priority: PagePriority
  selected: boolean  // default selection
}

const CATEGORY_PATTERNS: Record<PageCategory, RegExp[]> = {
  home: [
    /^https?:\/\/[^\/]+\/?$/,  // Just domain
    /\/index\.(html|php)$/i,
    /\/home\/?$/i
  ],
  about: [
    /\/about/i,
    /\/uber-uns/i,
    /\/über-uns/i,
    /\/team/i,
    /\/company/i,
    /\/who-we-are/i,
    /\/our-story/i,
    /\/geschichte/i
  ],
  services: [
    /\/services/i,
    /\/leistungen/i,
    /\/angebot/i,
    /\/products/i,
    /\/pricing/i,
    /\/preis/i,
    /\/treatments/i,
    /\/behandlungen/i
  ],
  contact: [
    /\/contact/i,
    /\/kontakt/i,
    /\/impressum/i,
    /\/get-in-touch/i,
    /\/reach-us/i
  ],
  blog: [
    /\/blog/i,
    /\/news/i,
    /\/articles/i,
    /\/posts/i,
    /\/aktuelles/i
  ],
  legal: [
    /\/privacy/i,
    /\/datenschutz/i,
    /\/cookies/i,
    /\/terms/i,
    /\/agb/i,
    /\/legal/i,
    /\/disclaimer/i
  ],
  other: []  // Catch-all for pages that don't match other categories
}

const LOW_PRIORITY_PATTERNS = [
  /\/404/i,
  /\/thank-you/i,
  /\/success/i,
  /\/download/i,
  /\.pdf$/i,
  /\.zip$/i,
  /\.jpg$/i,
  /\.png$/i,
  /\/wp-admin/i,
  /\/admin/i,
  /\/login/i
]

export function categorizePage(url: string, title: string | null): CategorizedPage {
  let category: PageCategory = 'other'

  // Match against patterns
  for (const [cat, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(url))) {
      category = cat as PageCategory
      break
    }
  }

  // Determine priority
  let priority: PagePriority = 'medium'

  if (category === 'home' || category === 'about' || category === 'services' || category === 'contact') {
    priority = 'high'
  } else if (category === 'legal' || LOW_PRIORITY_PATTERNS.some(p => p.test(url))) {
    priority = 'low'
  }

  // Auto-select high priority pages
  const selected = priority === 'high'

  return {
    url,
    title,
    category,
    priority,
    selected
  }
}

export function categorizePages(links: { url: string; title: string | null }[]): CategorizedPage[] {
  const pages = links.map(link => categorizePage(link.url, link.title))

  // Sort by priority (high first)
  pages.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  return pages
}
