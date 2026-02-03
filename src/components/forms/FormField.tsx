'use client'

import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  name: string
  error?: string
  description?: string
  required?: boolean
  children?: React.ReactNode
  className?: string
}

export function FormField({
  label,
  name,
  error,
  description,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={name} className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {description && !error && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  name: string
  error?: string
  description?: string
  required?: boolean
}

export function FormInput({
  label,
  name,
  error,
  description,
  required,
  className,
  ...props
}: FormInputProps) {
  return (
    <FormField
      label={label}
      name={name}
      error={error}
      description={description}
      required={required}
    >
      <Input
        id={name}
        name={name}
        className={cn(error && 'border-red-500', className)}
        {...props}
      />
    </FormField>
  )
}

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  name: string
  error?: string
  description?: string
  required?: boolean
}

export function FormTextarea({
  label,
  name,
  error,
  description,
  required,
  className,
  ...props
}: FormTextareaProps) {
  return (
    <FormField
      label={label}
      name={name}
      error={error}
      description={description}
      required={required}
    >
      <Textarea
        id={name}
        name={name}
        className={cn(error && 'border-red-500', className)}
        {...props}
      />
    </FormField>
  )
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  name: string
  error?: string
  description?: string
  required?: boolean
  options: { value: string; label: string }[]
  placeholder?: string
}

export function FormSelect({
  label,
  name,
  error,
  description,
  required,
  options,
  placeholder,
  className,
  ...props
}: FormSelectProps) {
  return (
    <FormField
      label={label}
      name={name}
      error={error}
      description={description}
      required={required}
    >
      <select
        id={name}
        name={name}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormField>
  )
}

interface FormCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  name: string
  error?: string
  description?: string
}

export function FormCheckbox({
  label,
  name,
  error,
  description,
  className,
  ...props
}: FormCheckboxProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        type="checkbox"
        id={name}
        name={name}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        {...props}
      />
      <div>
        <Label htmlFor={name} className="font-normal">
          {label}
        </Label>
        {description && !error && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  )
}
