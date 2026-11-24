import type { HTMLAttributes } from 'react'

export type CardVariant = 'default' | 'dark'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant
  /** No inner padding, so a photo reaches the edges of the card. */
  flush?: boolean
}

const variantClasses: Record<CardVariant, string> = {
  default: 'border border-border bg-surface-card',
  // White text only and nothing interactive: the purple of links, buttons and the focus ring
  // has 2.39:1 on this background, below AA
  dark: 'bg-brand-dark text-text-light',
}

function Card({ variant = 'default', flush = false, className, children, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={[
        'rounded-md shadow-card',
        flush ? 'overflow-hidden' : 'p-card',
        variantClasses[variant],
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      {children}
    </div>
  )
}

export default Card
