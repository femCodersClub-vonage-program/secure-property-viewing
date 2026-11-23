import type { ReactNode, Ref } from 'react'

type Props = {
  children: ReactNode
  /** React 19 passes ref as a normal prop, so a screen can move the focus to its heading */
  ref?: Ref<HTMLHeadingElement>
}

// The h1 of the dashboard screens, so its look lives in one place.
// tabIndex -1 lets a screen focus it from code without adding it to the Tab order.
// When it gets the focus from the keyboard, as after "Try again", it shows the design system focus ring
// (docs/design-system.md → Focus) instead of the browser's default outline
function DashboardHeading({ children, ref }: Props) {
  return (
    <h1
      ref={ref}
      tabIndex={-1}
      className="font-dashboard-display text-4xl font-bold tracking-tight text-balance text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
    >
      {children}
    </h1>
  )
}

export default DashboardHeading
