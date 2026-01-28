'use client'

import { Input, Textarea } from '@/components/ui'
import type { EventField } from '@/lib/event-templates'

interface FieldRendererProps {
  field: EventField
  value: unknown
  onChange: (value: unknown) => void
  disabled?: boolean
}

function FieldRenderer({ field, value, onChange, disabled }: FieldRendererProps) {
  const fieldValue = value ?? field.defaultValue ?? ''

  switch (field.type) {
    case 'text':
      return (
        <div>
          <label className="block text-meta text-text-secondary mb-xs">
            {field.label}
            {field.required && <span className="text-semantic-critical ml-1">*</span>}
          </label>
          <Input
            type="text"
            value={fieldValue as string}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            required={field.required}
          />
        </div>
      )

    case 'textarea':
      return (
        <div>
          <label className="block text-meta text-text-secondary mb-xs">
            {field.label}
            {field.required && <span className="text-semantic-critical ml-1">*</span>}
          </label>
          <Textarea
            value={fieldValue as string}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 2}
            disabled={disabled}
            required={field.required}
          />
        </div>
      )

    case 'number':
    case 'duration':
      return (
        <div>
          <label className="block text-meta text-text-secondary mb-xs">
            {field.label}
            {field.unit && ` (${field.unit})`}
            {field.required && <span className="text-semantic-critical ml-1">*</span>}
          </label>
          <Input
            type="number"
            value={fieldValue as number}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            disabled={disabled}
            required={field.required}
          />
        </div>
      )

    case 'checkbox':
      return (
        <div className="flex items-center gap-sm">
          <input
            type="checkbox"
            id={field.id}
            checked={fieldValue as boolean}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 rounded border-divider text-accent-primary focus:ring-accent-focus"
          />
          <label htmlFor={field.id} className="text-body text-text-primary cursor-pointer">
            {field.label}
            {field.required && <span className="text-semantic-critical ml-1">*</span>}
          </label>
        </div>
      )

    case 'select':
      return (
        <div>
          <label className="block text-meta text-text-secondary mb-xs">
            {field.label}
            {field.required && <span className="text-semantic-critical ml-1">*</span>}
          </label>
          <select
            value={fieldValue as string}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={field.required}
            className="w-full h-button px-sm rounded-md border border-divider text-body text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-accent-focus"
          >
            <option value="">Select...</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )

    default:
      return null
  }
}

interface TemplateFormRendererProps {
  fields: EventField[]
  values: Record<string, unknown>
  onChange: (fieldId: string, value: unknown) => void
  disabled?: boolean
}

export function TemplateFormRenderer({
  fields,
  values,
  onChange,
  disabled,
}: TemplateFormRendererProps) {
  if (fields.length === 0) {
    return null
  }

  return (
    <div className="space-y-sm">
      {fields.map((field) => (
        <FieldRenderer
          key={field.id}
          field={field}
          value={values[field.id]}
          onChange={(value) => onChange(field.id, value)}
          disabled={disabled}
        />
      ))}
    </div>
  )
}
