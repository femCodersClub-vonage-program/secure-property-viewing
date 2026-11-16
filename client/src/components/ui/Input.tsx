import type { ComponentPropsWithRef } from 'react'

// With ref, so a screen can move the focus to the field
type InputProps = ComponentPropsWithRef<'input'>

function Input({ className, type = 'text', ...props }: InputProps) {
  return (
    <input
      {...props}
      type={type}
      className={[
        'w-full rounded-sm border border-border-input bg-surface-input font-body text-text-default px-3 py-2',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    />
  )
}

export default Input
