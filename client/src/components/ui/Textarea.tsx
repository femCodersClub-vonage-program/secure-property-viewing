import type { TextareaHTMLAttributes } from 'react'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
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

export default Textarea
