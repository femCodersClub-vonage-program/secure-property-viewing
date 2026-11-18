import type { HTMLAttributes } from 'react'

export type CardVariant = 'default' | 'dark'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant
}

const variantClasses: Record<CardVariant, string> = {
  default: 'border border-border bg-surface-card',
  // White text only and nothing interactive: the purple of links, buttons and the focus ring
  // has 2.39:1 on this background, below AA
  dark: 'bg-brand-dark text-text-light',
}

function Card({ variant = 'default', className, children, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={['rounded-md shadow-card p-card', variantClasses[variant], className ?? '']
        .join(' ')
        .trim()}
    >
      {children}
    </div>
  )
}

export default Card
