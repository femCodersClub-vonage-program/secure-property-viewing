import type { ComponentPropsWithRef } from 'react'

export type InputVariant = 'default' | 'code'

// With ref, so a screen can move the focus to the field
type InputProps = ComponentPropsWithRef<'input'> & {
  variant?: InputVariant
}

const variantClasses: Record<InputVariant, string> = {
  default: 'px-3 py-2',
  // A short code, such as the 6 digits of an SMS, read at a glance
  code: 'px-3 py-3 text-center text-3xl font-bold tracking-widest tabular-nums',
}

function Input({ className, type = 'text', variant = 'default', ...props }: InputProps) {
  const invalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true'

  return (
    <input
      {...props}
      type={type}
      className={[
        'w-full rounded-sm bg-surface-input font-body text-text-default',
        invalid ? 'border-2 border-error' : 'border border-border-input',
        variantClasses[variant],
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    />
  )
}

export default Input
