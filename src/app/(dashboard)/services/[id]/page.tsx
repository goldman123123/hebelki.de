import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ServiceDetailsForm } from './components/ServiceDetailsForm'
import { StaffPriorityManager } from './components/StaffPriorityManager'
import { db } from '@/lib/db'
import { services, businessMembers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'
import { getTranslations } from 'next-intl/server'

export default async function ServiceDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id: serviceId } = await params
  const { userId } = await auth()

  if (!userId) {
    return notFound()
  }

  // Get business for user
  const member = await db.query.businessMembers.findFirst({
    where: and(
      eq(businessMembers.clerkUserId, userId),
      eq(businessMembers.status, 'active')
    ),
    with: {
      business: true
    }
  })

  if (!member || !member.business) {
    return notFound()
  }

  // Get service
  const service = await db.query.services.findFirst({
    where: and(
      eq(services.id, serviceId),
      eq(services.businessId, member.business.id)
    )
  })

  if (!service) {
    return notFound()
  }

  const t = await getTranslations('dashboard.services.detail')

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/services">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{service.name}</h1>
            <p className="text-sm text-muted-foreground">
              {service.durationMinutes} {t('minutes')}
              {service.price && ` • ${service.price} EUR`}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">{t('details')}</TabsTrigger>
          <TabsTrigger value="staff">{t('staffPriority')}</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <ServiceDetailsForm service={service} />
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <StaffPriorityManager serviceId={serviceId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
