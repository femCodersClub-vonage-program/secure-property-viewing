import { Link as RouterLink } from 'react-router'
import type { AnchorHTMLAttributes, ComponentProps } from 'react'

const linkClasses =
  'text-brand-primary underline font-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary'

type InternalLinkProps = { to: string } & Omit<ComponentProps<typeof RouterLink>, 'to'>
type ExternalLinkProps = { href: string } & AnchorHTMLAttributes<HTMLAnchorElement>

type LinkProps = InternalLinkProps | ExternalLinkProps

function isInternal(props: LinkProps): props is InternalLinkProps {
  return 'to' in props
}

function Link(props: LinkProps) {
  if (isInternal(props)) {
    const { to, className, ...rest } = props
    return (
      <RouterLink
        to={to}
        className={[linkClasses, className].filter(Boolean).join(' ')}
        {...rest}
      />
    )
  }

  const { href, className, ...rest } = props
  return <a href={href} className={[linkClasses, className].filter(Boolean).join(' ')} {...rest} />
}

export default Link
