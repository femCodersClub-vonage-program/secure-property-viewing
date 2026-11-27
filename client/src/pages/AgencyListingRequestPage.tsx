import { useParams } from 'react-router'
import { ListingRequestNotFound, RequestDetails } from '../features/agency-dashboard'

// D3: sample data until the endpoints of #57 are in dev
function AgencyListingRequestPage() {
  const { id } = useParams()
  const requestId = Number(id)
  // Only a positive whole number the server can read is a request id. "abc", "1.5" or an id too long
  // for a number say it does not exist without asking, because the server would answer 400 to them
  const valid = Number.isSafeInteger(requestId) && requestId > 0

  return (
    <>
      <title>Request details · Peephole</title>
      {/* key: another id in the address starts the screen again, so it never shows the previous request */}
      {valid ? <RequestDetails key={requestId} id={requestId} /> : <ListingRequestNotFound />}
    </>
  )
}

export default AgencyListingRequestPage
