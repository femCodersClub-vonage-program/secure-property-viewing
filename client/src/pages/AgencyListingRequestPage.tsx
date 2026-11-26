import { useParams } from 'react-router'
import { ListingRequestNotFound, RequestDetails } from '../features/agency-dashboard'

// D3: sample data until the endpoints of #57 are in dev
function AgencyListingRequestPage() {
  const { id } = useParams()
  const requestId = Number(id)
  // Only a positive whole number is a request id: "abc" or "1.5" say it does not exist, without asking
  const valid = Number.isInteger(requestId) && requestId > 0

  return (
    <>
      <title>Request details · Peephole</title>
      {/* key: another id in the address starts the screen again, so it never shows the previous request */}
      {valid ? <RequestDetails key={requestId} id={requestId} /> : <ListingRequestNotFound />}
    </>
  )
}

export default AgencyListingRequestPage
