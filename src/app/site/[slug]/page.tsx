import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { businesses, businessWebsites } from '@/lib/db/schema'
import type { TemplateId, WebsiteSectionContent } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getTemplateComponent } from '@/modules/website/templates'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}

async function getWebsiteData(slug: string, allowPreview: boolean) {
  const business = await db
    .select()
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1)
    .then(r => r[0])

  if (!business) return null

  const websiteQuery = db
    .select()
    .from(businessWebsites)
    .where(eq(businessWebsites.businessId, business.id))
    .limit(1)

  const website = await websiteQuery.then(r => r[0])

  if (!website) return null
  if (!website.isPublished && !allowPreview) return null
  if (!website.sections) return null

  return { business, website }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const { preview } = await searchParams
  const data = await getWebsiteData(slug, preview === 'true')

  if (!data) return { title: 'Not Found' }

  return {
    title: data.website.metaTitle || data.business.name,
    description: data.website.metaDescription || data.business.description || '',
    openGraph: {
      title: data.website.metaTitle || data.business.name,
      description: data.website.metaDescription || data.business.description || '',
      type: 'website',
    },
  }
}

export default async function SitePage({ params, searchParams }: Props) {
  const { slug } = await params
  const { preview } = await searchParams
  const data = await getWebsiteData(slug, preview === 'true')

  if (!data) notFound()

  const Template = getTemplateComponent(data.website.templateId as TemplateId)
  const sections = data.website.sections as WebsiteSectionContent

  return (
    <Template
      business={{
        name: data.business.name,
        slug: data.business.slug,
        tagline: data.business.tagline,
        description: data.business.description,
        logoUrl: data.business.logoUrl,
        primaryColor: data.business.primaryColor,
        email: data.business.email,
        phone: data.business.phone,
        address: data.business.address,
        website: data.business.website,
        socialInstagram: data.business.socialInstagram,
        socialFacebook: data.business.socialFacebook,
        socialLinkedin: data.business.socialLinkedin,
        socialTwitter: data.business.socialTwitter,
      }}
      sections={sections}
    />
  )
}
