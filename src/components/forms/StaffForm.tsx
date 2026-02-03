'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormInput, FormTextarea, FormCheckbox } from './FormField'
import { FormDialog } from './FormDialog'
import { ServiceMultiSelect } from './ServiceMultiSelect'

// Input schema
const staffFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  phone: z.string().max(20).optional().nullable(),
  title: z.string().max(100).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  isActive: z.boolean().optional(),
  serviceIds: z.array(z.string()).optional(),
})

type StaffFormValues = z.infer<typeof staffFormSchema>

interface Service {
  id: string
  name: string
  category: string | null
}

interface StaffFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: StaffFormValues) => Promise<void>
  defaultValues?: Partial<StaffFormValues>
  isEditing?: boolean
}

export function StaffForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isEditing = false,
}: StaffFormProps) {
  const [services, setServices] = useState<Service[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    defaultValues?.serviceIds || []
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      title: '',
      bio: '',
      avatarUrl: '',
      isActive: true,
      serviceIds: [],
      ...defaultValues,
    },
  })

  useEffect(() => {
    async function fetchServices() {
      const res = await fetch('/api/admin/services')
      const data = await res.json()
      setServices(data.services?.filter((s: Service & { isActive: boolean }) => s.isActive) || [])
    }
    if (open) {
      fetchServices()
      setSelectedServiceIds(defaultValues?.serviceIds || [])
    }
  }, [open, defaultValues?.serviceIds])

  useEffect(() => {
    setValue('serviceIds', selectedServiceIds)
  }, [selectedServiceIds, setValue])

  const handleFormSubmit = async (data: StaffFormValues) => {
    await onSubmit({ ...data, serviceIds: selectedServiceIds })
    if (!isEditing) {
      reset()
      setSelectedServiceIds([])
    }
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          reset()
          setSelectedServiceIds([])
        }
        onOpenChange(open)
      }}
      title={isEditing ? 'Edit Staff Member' : 'New Staff Member'}
      description={isEditing ? 'Update staff details' : 'Add a new team member'}
      onSubmit={handleSubmit(handleFormSubmit)}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? 'Save Changes' : 'Add Staff'}
    >
      <FormInput
        label="Name"
        required
        {...register('name')}
        error={errors.name?.message}
        placeholder="Full name"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          label="Email"
          type="email"
          {...register('email')}
          error={errors.email?.message}
          placeholder="email@example.com"
        />

        <FormInput
          label="Phone"
          {...register('phone')}
          error={errors.phone?.message}
          placeholder="+49 123 456789"
        />
      </div>

      <FormInput
        label="Title/Role"
        {...register('title')}
        error={errors.title?.message}
        placeholder="e.g., Physical Therapist, Stylist"
      />

      <FormTextarea
        label="Bio"
        {...register('bio')}
        error={errors.bio?.message}
        placeholder="Brief description..."
        rows={2}
      />

      <FormInput
        label="Avatar URL"
        {...register('avatarUrl')}
        error={errors.avatarUrl?.message}
        placeholder="https://..."
        description="Link to profile photo"
      />

      <ServiceMultiSelect
        services={services}
        selectedIds={selectedServiceIds}
        onChange={setSelectedServiceIds}
      />

      <FormCheckbox
        label="Active"
        description="Inactive staff are hidden from booking"
        {...register('isActive')}
        defaultChecked={watch('isActive')}
      />
    </FormDialog>
  )
}
