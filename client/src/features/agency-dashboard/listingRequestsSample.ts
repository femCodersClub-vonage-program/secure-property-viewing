import { sampleDelay, sampleListingRequests } from './listingRequestDetailsSample'
import type { ListingRequestDetails, ListingRequestStatus, ListingRequestSummary } from './types'

// D2 sample data while the endpoints of #57 are not in dev. It is read from the D3 samples,
// so a request reviewed in D3 moves to its new tab here

function toSummary(request: ListingRequestDetails): ListingRequestSummary {
  return {
    id: request.id,
    ownerName: request.ownerName,
    title: request.title,
    operation: request.operation,
    priceEuros: request.priceEuros,
    createdAt: request.createdAt,
    status: request.status,
  }
}

// As the server sorts them: the newest first, and the higher id first on the same time
function newestFirst(a: ListingRequestSummary, b: ListingRequestSummary) {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id
}

/** Like getListingRequests in api.ts. */
export async function getListingRequests(
  status: ListingRequestStatus,
  signal?: AbortSignal,
): Promise<ListingRequestSummary[]> {
  await sampleDelay(signal)
  return sampleListingRequests()
    .filter((request) => request.status === status)
    .map(toSummary)
    .sort(newestFirst)
}
