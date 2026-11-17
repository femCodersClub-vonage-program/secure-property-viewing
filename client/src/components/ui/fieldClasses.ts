import type { AriaAttributes } from 'react'

// Input, Select and Textarea share one look, so a field with an error looks the same in all three
export const fieldClasses =
  'w-full rounded-sm bg-surface-input font-body text-text-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary'

export function fieldBorderClasses(ariaInvalid: AriaAttributes['aria-invalid']): string {
  const invalid = ariaInvalid === true || ariaInvalid === 'true'
  return invalid ? 'border-2 border-error' : 'border border-border-input'
}
