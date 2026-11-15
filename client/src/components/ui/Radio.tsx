import type { InputHTMLAttributes } from 'react'

type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

function Radio({ className, ...props }: RadioProps) {
  return (
    <input
      {...props}
      type="radio"
      className={[
        'accent-brand-primary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    />
  )
}

export default Radio
