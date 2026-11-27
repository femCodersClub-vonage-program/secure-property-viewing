export type BadgeVariant = 'pending' | 'approved' | 'rejected' | 'warning'

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  pending: 'bg-text-muted/10 text-text-muted border border-text-muted',
  // The card background, not a 10% tint: green text on its own tint is 4.48:1, under AA,
  // and on the card it is 5.12:1 on any page background
  approved: 'bg-surface-card text-success border border-success',
  rejected: 'bg-error/10 text-error border border-error',
  warning: 'bg-warning/10 text-warning border border-warning',
}

function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={[
        'rounded-sm font-body font-semibold text-xs px-2 py-0.5',
        variantClasses[variant],
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      {children}
    </span>
  )
}

export default Badge
