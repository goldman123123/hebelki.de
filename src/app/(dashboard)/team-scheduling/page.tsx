'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Users, Clock, CalendarOff } from 'lucide-react'
import { TeamMembersTab } from '@/components/team-scheduling/TeamMembersTab'
import { BusinessHoursTab } from '@/components/team-scheduling/BusinessHoursTab'
import { TimeOffTab } from '@/components/team-scheduling/TimeOffTab'

interface TimeSlot {
  startTime: string
  endTime: string
}

interface WeeklySchedule {
  [key: number]: TimeSlot[]
}

interface Template {
  id: string
  name: string
  isDefault: boolean
  staffId: string | null
  slots: {
    dayOfWeek: number
    startTime: string
    endTime: string
  }[]
}

interface Override {
  override: {
    id: string
    date: string
    isAvailable: boolean | null
    startTime: string | null
    endTime: string | null
    reason: string | null
    staffId: string | null
  }
  staffMember: { name: string } | null
}

interface StaffMember {
  id: string
  name: string
  email: string | null
  phone: string | null
  title: string | null
  bio: string | null
  avatarUrl: string | null
  isActive: boolean | null
  serviceIds?: string[]
}

interface Service {
  id: string
  name: string
  category: string | null
}

export default function TeamSchedulingPage() {
  const [activeTab, setActiveTab] = useState('team')
  const [loading, setLoading] = useState(true)

  // Team Members Tab State
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [services, setServices] = useState<Service[]>([])

  // Business Hours Tab State
  const [businessTemplate, setBusinessTemplate] = useState<Template | null>(null)
  const [businessSchedule, setBusinessSchedule] = useState<WeeklySchedule>({})

  // Time Off Tab State
  const [overrides, setOverrides] = useState<Override[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [templatesRes, staffRes, servicesRes, overridesRes] = await Promise.all([
        fetch('/api/admin/availability/templates'),
        fetch('/api/admin/staff'),
        fetch('/api/admin/services'),
        fetch('/api/admin/availability/overrides'),
      ])

      const [templatesData, staffData, servicesData, overridesData] = await Promise.all([
        templatesRes.json(),
        staffRes.json(),
        servicesRes.json(),
        overridesRes.json(),
      ])

      // Business template
      const businessTpl = templatesData.templates?.find(
        (t: Template) => !t.staffId && t.isDefault
      )
      if (businessTpl) {
        setBusinessTemplate(businessTpl)
        setBusinessSchedule(slotsToSchedule(businessTpl.slots))
      }

      setStaffMembers(staffData.staff || [])
      setServices(servicesData.services?.filter((s: Service & { isActive: boolean }) => s.isActive) || [])
      setOverrides(overridesData.overrides || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function slotsToSchedule(slots: { dayOfWeek: number; startTime: string; endTime: string }[]): WeeklySchedule {
    const schedule: WeeklySchedule = {}
    slots.forEach((slot) => {
      if (!schedule[slot.dayOfWeek]) {
        schedule[slot.dayOfWeek] = []
      }
      schedule[slot.dayOfWeek].push({
        startTime: slot.startTime,
        endTime: slot.endTime,
      })
    })
    return schedule
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Team & Planung</h1>
        <p className="text-gray-600">Verwalten Sie Ihr Team, Geschäftszeiten und Abwesenheiten</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Team Mitglieder</span>
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Geschäftszeiten</span>
          </TabsTrigger>
          <TabsTrigger value="timeoff" className="flex items-center gap-2">
            <CalendarOff className="h-4 w-4" />
            <span>Abwesenheiten</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <TeamMembersTab
            staffMembers={staffMembers}
            services={services}
            businessSchedule={businessSchedule}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="business">
          <BusinessHoursTab
            businessTemplate={businessTemplate}
            businessSchedule={businessSchedule}
            onBusinessTemplateChange={setBusinessTemplate}
            onBusinessScheduleChange={setBusinessSchedule}
          />
        </TabsContent>

        <TabsContent value="timeoff">
          <TimeOffTab
            overrides={overrides}
            staffMembers={staffMembers.filter((s) => s.isActive)}
            onRefresh={fetchData}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
