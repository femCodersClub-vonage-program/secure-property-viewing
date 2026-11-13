import type { SelectHTMLAttributes } from 'react'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={[
        'w-full rounded-sm border border-border-input bg-surface-input font-body text-text-default px-3 py-2',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      {children}
    </select>
  )
}

export default Select
