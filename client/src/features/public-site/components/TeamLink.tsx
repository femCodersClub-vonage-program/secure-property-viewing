interface TeamLinkProps {
  name: string
  role: string
  href: string
}

// Only on brand-dark surfaces: pink text on white is 3.71:1, below AA, and the white focus
// outline is invisible there
function TeamLink({ name, role, href }: TeamLinkProps) {
  return (
    <a
      href={href}
      className="group inline-flex min-h-11 flex-col rounded-sm font-body no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text-light"
    >
      <span className="font-semibold text-brand-accent underline-offset-4 group-hover:underline">
        {name}
      </span>{' '}
      <span className="text-sm text-text-light">{role}</span>
    </a>
  )
}

export default TeamLink
