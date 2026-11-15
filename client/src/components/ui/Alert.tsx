export type AlertVariant = 'info' | 'success' | 'error' | 'warning'

interface AlertProps {
  variant: AlertVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<AlertVariant, string> = {
  info: 'text-text-default border-border',
  success: 'text-success border-success',
  error: 'text-error border-error',
  warning: 'text-warning border-warning',
}

function Alert({ variant, children, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={['rounded-sm border font-body px-4 py-3', variantClasses[variant], className ?? '']
        .join(' ')
        .trim()}
    >
      {children}
    </div>
  )
}

export default Alert
