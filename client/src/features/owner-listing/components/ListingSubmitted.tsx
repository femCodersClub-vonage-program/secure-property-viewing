import { Check, ClipboardList, Smartphone, Video } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Card, Link } from '../../../components/ui'

// The three next steps from the spec, in order
const NEXT_STEPS = [
  {
    icon: ClipboardList,
    title: 'Information review',
    text: 'The agency checks the details of your property.',
  },
  {
    icon: Smartphone,
    title: 'Agency contact',
    text: 'The agency sends you an SMS to arrange a video call.',
  },
  {
    icon: Video,
    title: 'Video call with the agency',
    text: 'You show the property and validate the request together.',
  },
]

// B5: no "View request details", because owners have no account: the agency keeps them informed by SMS
function ListingSubmitted() {
  const headingRef = useRef<HTMLHeadingElement>(null)

  // The owner arrives from the form, so the focus starts at the new page's heading
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <Card className="flex flex-col gap-8 px-6 py-8 sm:px-10">
      <header className="flex flex-col items-center gap-4 text-center">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-pill bg-linear-to-br from-brand-primary to-brand-accent text-text-light"
        >
          <Check className="size-8" strokeWidth={3} />
        </span>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-3xl font-bold text-balance text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary sm:text-4xl"
        >
          Your request has been sent
        </h1>
        <p className="max-w-prose font-body text-lg text-text-default">
          The agency will review your information and contact you by SMS to validate your property
          in a video call.
        </p>
      </header>

      <section
        aria-labelledby="next-steps-title"
        className="flex flex-col gap-4 border-t border-border pt-6"
      >
        <h2 id="next-steps-title" className="font-display text-2xl font-bold text-brand-secondary">
          Next steps
        </h2>
        <ol className="flex flex-col gap-4">
          {NEXT_STEPS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-brand-primary/10 text-brand-primary"
              >
                <Icon className="size-5" />
              </span>
              <div>
                <p className="font-body font-bold text-text-default">{title}</p>
                <p className="font-body text-text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <Link to="/" variant="button" className="self-center">
        Back to the home page
      </Link>
    </Card>
  )
}

export default ListingSubmitted
