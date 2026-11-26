import { Link } from '../../../components/ui'
import DashboardHeading from './DashboardHeading'

const DEFAULT_MESSAGE = 'The listing request does not exist.'

/**
 * D3 for a request that does not exist: the server answered 404, or the id in the address is not one.
 * Not an error the agent can fix by trying again, so it is muted text with a way back (docs/design-system.md → States)
 */
function ListingRequestNotFound({ message = DEFAULT_MESSAGE }: { message?: string }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <DashboardHeading>Request details</DashboardHeading>
      <p className="text-text-muted">{message}</p>
      <Link to="/agency/listing-requests">Back to listing requests</Link>
    </div>
  )
}

export default ListingRequestNotFound
