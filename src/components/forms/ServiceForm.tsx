'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormInput, FormTextarea, FormCheckbox } from './FormField'
import { FormDialog } from './FormDialog'

// Input schema (what the form accepts)
const serviceFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  durationMinutes: z.number().min(5, 'Duration must be at least 5 minutes').max(480, 'Duration cannot exceed 8 hours'),
  bufferMinutes: z.number().min(0).max(60).optional(),
  price: z.string().regex(/^(\d+(\.\d{1,2})?)?$/, 'Invalid price format').optional().nullable(),
  isActive: z.boolean().optional(),
})

type ServiceFormValues = z.infer<typeof serviceFormSchema>

interface ServiceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ServiceFormValues) => Promise<void>
  defaultValues?: Partial<ServiceFormValues>
  isEditing?: boolean
}

export function ServiceForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isEditing = false,
}: ServiceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      durationMinutes: 60,
      bufferMinutes: 0,
      price: '',
      isActive: true,
      ...defaultValues,
    },
  })

  const handleFormSubmit = async (data: ServiceFormValues) => {
    await onSubmit({
      ...data,
      bufferMinutes: data.bufferMinutes ?? 0,
      isActive: data.isActive ?? true,
    })
    if (!isEditing) {
      reset()
    }
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(open) => {
        if (!open) reset()
        onOpenChange(open)
      }}
      title={isEditing ? 'Edit Service' : 'New Service'}
      description={isEditing ? 'Update service details' : 'Add a new service to your offerings'}
      onSubmit={handleSubmit(handleFormSubmit)}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? 'Save Changes' : 'Create Service'}
    >
      <FormInput
        label="Service Name"
        required
        {...register('name')}
        error={errors.name?.message}
        placeholder="e.g., Initial Consultation"
      />

      <FormTextarea
        label="Description"
        {...register('description')}
        error={errors.description?.message}
        placeholder="Brief description of the service..."
        rows={2}
      />

      <FormInput
        label="Category"
        {...register('category')}
        error={errors.category?.message}
        placeholder="e.g., Consultation, Treatment"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          label="Duration (minutes)"
          type="number"
          required
          {...register('durationMinutes', { valueAsNumber: true })}
          error={errors.durationMinutes?.message}
        />

        <FormInput
          label="Buffer (minutes)"
          type="number"
          {...register('bufferMinutes', { valueAsNumber: true })}
          error={errors.bufferMinutes?.message}
          description="Break time after appointment"
        />
      </div>

      <FormInput
        label="Price"
        {...register('price')}
        error={errors.price?.message}
        placeholder="0.00"
        description="Leave empty for free services"
      />

      <FormCheckbox
        label="Active"
        description="Inactive services are hidden from booking"
        {...register('isActive')}
        defaultChecked={watch('isActive')}
      />
    </FormDialog>
  )
}
