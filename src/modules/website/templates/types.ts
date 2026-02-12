import type { WebsiteSectionContent, TemplateId } from '@/lib/db/schema'

export type { WebsiteSectionContent, TemplateId }

export interface TemplateProps {
  business: {
    name: string
    slug: string
    tagline: string | null
    description: string | null
    logoUrl: string | null
    primaryColor: string | null
    email: string | null
    phone: string | null
    address: string | null
    website: string | null
    socialInstagram: string | null
    socialFacebook: string | null
    socialLinkedin: string | null
    socialTwitter: string | null
  }
  sections: WebsiteSectionContent
}
