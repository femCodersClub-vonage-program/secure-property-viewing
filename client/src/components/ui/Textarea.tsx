import type { TextareaHTMLAttributes } from 'react'
import { fieldBorderClasses, fieldClasses } from './fieldClasses'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={[
        fieldClasses,
        fieldBorderClasses(props['aria-invalid']),
        'px-3 py-2',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    />
  )
}

export default Textarea
