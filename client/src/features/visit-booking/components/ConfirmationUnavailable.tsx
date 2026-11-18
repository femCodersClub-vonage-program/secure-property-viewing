import { Link } from '../../../components/ui'

/** A6 opened with no booked visit in the history, such as from a copied address. */
function ConfirmationUnavailable() {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="font-display text-3xl font-bold text-balance text-brand-dark">
        This confirmation is no longer available
      </h1>
      <p className="font-body text-text-default">
        A visit is only shown here right after booking it. If you booked one, use the link you saved
        to enter the room.
      </p>
      <Link to="/">See other properties</Link>
    </section>
  )
}

export default ConfirmationUnavailable
