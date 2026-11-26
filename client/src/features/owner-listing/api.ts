import { request } from '../../lib/http'
import type { ListingRequest, SubmittedListingRequest } from './types'

// Checks the 201 response, so a broken answer never reaches the screens
export function parseSubmittedListingRequest(data: unknown): SubmittedListingRequest {
  if (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    typeof data.id === 'number' &&
    'status' in data &&
    data.status === 'PENDING'
  ) {
    return { id: data.id, status: data.status }
  }
  throw new Error('Unexpected POST /api/listing-requests response')
}

export function submitListingRequest(listing: ListingRequest): Promise<SubmittedListingRequest> {
  return request('/api/listing-requests', parseSubmittedListingRequest, {
    method: 'POST',
    body: JSON.stringify(listing),
  })
}
