import type { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement>

function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={[
        'rounded-md border border-border bg-surface-card shadow-card p-card',
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
