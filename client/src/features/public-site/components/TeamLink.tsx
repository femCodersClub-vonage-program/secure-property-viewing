interface TeamLinkProps {
  name: string
  role: string
  href: string
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
}

// Only on brand-dark surfaces: white text and a white focus outline
function TeamLink({ name, role, href }: TeamLinkProps) {
  return (
    <a
      href={href}
      className="group inline-flex items-center gap-4 rounded-md font-body text-text-light no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text-light"
    >
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-linear-to-br from-brand-primary to-brand-accent font-display text-xl font-bold"
      >
        {initialsOf(name)}
      </span>
      <span className="flex flex-col">
        <span className="font-semibold underline-offset-4 transition-colors group-hover:text-brand-accent group-hover:underline">
          {name}
        </span>{' '}
        <span className="text-sm text-text-light/80">{role}</span>
      </span>
    </a>
  )
}

export default TeamLink
