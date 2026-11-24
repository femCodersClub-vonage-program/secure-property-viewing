import { Link as RouterLink } from 'react-router'
import type { AnchorHTMLAttributes, ComponentProps } from 'react'

export type LinkVariant = 'default' | 'button' | 'button-on-dark' | 'outline-on-dark'

const buttonClasses =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-body font-semibold px-5 py-2 no-underline focus-visible:outline-2 focus-visible:outline-offset-2'

const variantClasses: Record<LinkVariant, string> = {
  default:
    'text-brand-primary underline font-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
  button: `${buttonClasses} bg-brand-primary text-surface-page hover:shadow-button hover:opacity-90 focus-visible:outline-brand-primary`,
  // White focus: the purple one is 2.39:1 on brand-dark, below AA
  'button-on-dark': `${buttonClasses} bg-brand-primary text-surface-page hover:shadow-button hover:opacity-90 focus-visible:outline-text-light`,
  'outline-on-dark': `${buttonClasses} border border-text-light text-text-light hover:bg-text-light/10 focus-visible:outline-text-light`,
}

type InternalLinkProps = { to: string; variant?: LinkVariant } & Omit<
  ComponentProps<typeof RouterLink>,
  'to'
>
type ExternalLinkProps = {
  href: string
  variant?: LinkVariant
} & AnchorHTMLAttributes<HTMLAnchorElement>

type LinkProps = InternalLinkProps | ExternalLinkProps

function isInternal(props: LinkProps): props is InternalLinkProps {
  return 'to' in props
}

function Link(props: LinkProps) {
  if (isInternal(props)) {
    const { to, variant = 'default', className, ...rest } = props
    return (
      <RouterLink
        to={to}
        className={[variantClasses[variant], className].filter(Boolean).join(' ')}
        {...rest}
      />
    )
  }

  const { href, variant = 'default', className, ...rest } = props
  return (
    <a
      href={href}
      className={[variantClasses[variant], className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

export default Link
