import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'link'
export type ButtonShape = 'default' | 'pill' | 'circle'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  shape?: ButtonShape
  loading?: boolean
}

// Each shape sets its own padding: a circle has none, so it can shrink to fit a 7-column calendar
const shapeClasses: Record<ButtonShape, string> = {
  default: 'rounded-md px-5 py-2',
  pill: 'rounded-pill px-5 py-2',
  circle: 'aspect-square rounded-pill p-0',
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-primary text-surface-page hover:shadow-button hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
  secondary:
    'bg-surface-page text-brand-primary border border-brand-primary hover:bg-brand-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
  danger:
    'bg-error text-surface-page hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error',
  // An action that looks like a link, for a secondary step such as changing the number
  link: 'min-h-11 bg-transparent text-brand-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
}

function Button({
  variant = 'primary',
  shape = 'default',
  loading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center gap-2 font-body font-semibold transition-all',
        shapeClasses[shape],
        variantClasses[variant],
        isDisabled && !loading ? 'cursor-not-allowed opacity-40' : '',
        loading ? 'cursor-wait opacity-80' : '',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      {loading ? (
        <svg
          className="size-4 motion-safe:animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : null}
      {children}
    </button>
  )
}

export default Button

