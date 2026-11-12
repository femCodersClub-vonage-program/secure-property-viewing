export type BadgeVariant = 'pending' | 'approved' | 'rejected'

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  pending: 'bg-text-muted/10 text-text-muted border border-text-muted',
  approved: 'bg-success/10 text-success border border-success',
  rejected: 'bg-error/10 text-error border border-error',
}

function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={['rounded-sm font-body font-semibold text-xs px-2 py-0.5', variantClasses[variant], className ?? '']
        .join(' ')
        .trim()}
    >
      {children}
    </span>
  )
}

export default Badge
