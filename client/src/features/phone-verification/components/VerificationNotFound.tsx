import { Link } from '../../../components/ui'

/** The operator's redirect came back to a tab with no saved verification, or a broken one. */
function VerificationNotFound() {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="font-display text-3xl font-bold text-balance text-brand-dark">
        We couldn't find your verification
      </h1>
      <p className="font-body text-text-default">
        It may have been opened in another tab or browser. Choose the property again to verify your
        phone.
      </p>
      <Link to="/">See the properties</Link>
    </section>
  )
}

export default VerificationNotFound
