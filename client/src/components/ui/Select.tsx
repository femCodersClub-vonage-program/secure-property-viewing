import type { SelectHTMLAttributes } from 'react'
import { fieldBorderClasses, fieldClasses } from './fieldClasses'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={[
        fieldClasses,
        fieldBorderClasses(props['aria-invalid']),
        'px-3 py-2',
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
