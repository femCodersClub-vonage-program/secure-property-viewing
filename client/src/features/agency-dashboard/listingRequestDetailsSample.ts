import { ApiError } from '../../lib/http'
import { REJECTION_REASON_MAX_LENGTH } from './api'
import type { ApprovedListing, ListingRequestDetails, RejectedListing } from './types'

// D3 sample data while the endpoints of #57 are not in dev (specs/agency-dashboard.md → API).
// The same functions and errors as api.ts, so the screen only changes its import when they arrive.
// Reviews stay in memory until the page reloads, and D2 reads them too (listingRequestsSample.ts)

const SAMPLE_DELAY_MS = 300

const abortError = () => new DOMException('Aborted', 'AbortError')

/** Waits like a call to the server, so the loading state shows, and fails like fetch when it is canceled. */
export function sampleDelay(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError())
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', cancel)
      resolve()
    }, SAMPLE_DELAY_MS)
    function cancel() {
      clearTimeout(timer)
      reject(abortError())
    }
    signal?.addEventListener('abort', cancel, { once: true })
  })
}

// The listing requests of the server seed (server/src/main/resources/db/seed/R__seed_02_activity.sql),
// as specs/data-model-and-api-contract.md asks: invented names, addresses and phone numbers
const requests: ListingRequestDetails[] = [
  {
    id: 900001,
    status: 'PENDING',
    ownerName: 'Ana Torres',
    ownerPhone: '+447700900201',
    title: 'Bright flat near Plaça del Sol',
    description:
      'A three-bedroom flat with a balcony over a quiet street, two minutes from the square.',
    propertyType: 'APARTMENT',
    operation: 'RENT',
    area: 'Gràcia',
    address: 'Fictional owner address 01, Barcelona',
    priceEuros: 1200,
    bedrooms: 3,
    sizeM2: 85,
    floor: 2,
    createdAt: '2026-11-14T17:02:00+01:00',
    reviewedAt: null,
    rejectionReason: null,
  },
  {
    id: 900002,
    status: 'PENDING',
    ownerName: 'Javier Martín',
    ownerPhone: '+447700900202',
    title: 'Family house in Sant Gervasi',
    description: 'A four-bedroom house with a small garden and a garage, close to schools.',
    propertyType: 'HOUSE',
    operation: 'SALE',
    area: 'Sant Gervasi',
    address: 'Fictional owner address 02, Barcelona',
    priceEuros: 640000,
    bedrooms: 4,
    sizeM2: 160,
    floor: null,
    createdAt: '2026-11-15T10:32:00+01:00',
    reviewedAt: null,
    rejectionReason: null,
  },
  {
    id: 900003,
    status: 'APPROVED',
    ownerName: 'Lucía Pérez',
    ownerPhone: '+447700900203',
    title: 'New owner listing in Gràcia',
    description: 'A newly approved listing without catalog photos or precise location.',
    propertyType: 'APARTMENT',
    operation: 'RENT',
    area: 'Gràcia',
    address: 'Fictional demo address 22, Barcelona',
    priceEuros: 1180,
    bedrooms: 2,
    sizeM2: 72,
    floor: 1,
    createdAt: '2026-11-08T12:02:00+01:00',
    reviewedAt: '2026-11-09T10:15:00+01:00',
    rejectionReason: null,
  },
  {
    id: 900004,
    status: 'REJECTED',
    ownerName: 'Marc Vidal',
    ownerPhone: '+447700900204',
    title: 'Penthouse with terrace in Eixample',
    description:
      'A three-bedroom penthouse with a large terrace. Available now, deposit required to book a visit.',
    propertyType: 'APARTMENT',
    operation: 'RENT',
    area: 'Eixample',
    address: 'Fictional owner address 04, Barcelona',
    priceEuros: 750,
    bedrooms: 3,
    sizeM2: 120,
    floor: 7,
    createdAt: '2026-11-10T22:42:00+01:00',
    reviewedAt: '2026-11-11T09:30:00+01:00',
    rejectionReason:
      'The photos belong to another property already listed in Barcelona, and the rent is far below the area. The owner could not show the property on a video call.',
  },
  {
    id: 900005,
    status: 'REJECTED',
    ownerName: 'R. Smith',
    ownerPhone: '+447700900205',
    title: 'Studio by the beach, ready today',
    description:
      'A furnished studio by the beach. I am abroad, so please send the deposit and I will mail the keys.',
    propertyType: 'STUDIO',
    operation: 'RENT',
    area: 'Barceloneta',
    address: 'Fictional owner address 05, Barcelona',
    priceEuros: 550,
    bedrooms: 0,
    sizeM2: 30,
    floor: 3,
    createdAt: '2026-11-11T23:59:00+01:00',
    reviewedAt: '2026-11-12T09:10:00+01:00',
    rejectionReason:
      'The phone number is a virtual number used in two earlier requests with different names, and the owner asked for a deposit before any visit.',
  },
]

// Far above the ids of the seed catalog, so a new property never looks like an existing one
let nextPropertyId = 101

// The same errors, codes and texts as the server of #57
function notFound() {
  return new ApiError({
    kind: 'business',
    status: 404,
    code: 'NOT_FOUND',
    message: 'The listing request does not exist.',
  })
}

function alreadyReviewed() {
  return new ApiError({
    kind: 'business',
    status: 409,
    code: 'LISTING_REQUEST_ALREADY_REVIEWED',
    message: 'The listing request has already been approved or rejected.',
  })
}

function invalidReason(reasonError: string) {
  return new ApiError({
    kind: 'business',
    status: 400,
    code: 'VALIDATION_FAILED',
    message: 'One or more fields are invalid.',
    fieldErrors: { reason: reasonError },
  })
}

function findRequest(id: number): ListingRequestDetails {
  const request = requests.find((candidate) => candidate.id === id)
  if (request === undefined) throw notFound()
  return request
}

function pendingRequest(id: number): ListingRequestDetails {
  const request = findRequest(id)
  if (request.status !== 'PENDING') throw alreadyReviewed()
  return request
}

/** Every sample request, for the D2 list. Copies, so a screen never changes the samples by mistake. */
export function sampleListingRequests(): ListingRequestDetails[] {
  return requests.map((request) => ({ ...request }))
}

/** Like getListingRequest in api.ts. */
export async function getListingRequest(
  id: number,
  signal?: AbortSignal,
): Promise<ListingRequestDetails> {
  await sampleDelay(signal)
  return { ...findRequest(id) }
}

/** Like approveListingRequest in api.ts. */
export async function approveListingRequest(id: number): Promise<ApprovedListing> {
  await sampleDelay()
  const request = pendingRequest(id)
  request.status = 'APPROVED'
  request.reviewedAt = new Date().toISOString()
  const propertyId = nextPropertyId
  nextPropertyId += 1
  return { propertyId }
}

/** Like rejectListingRequest in api.ts. The reason is checked first, as the server does with the body. */
export async function rejectListingRequest(id: number, reason: string): Promise<RejectedListing> {
  await sampleDelay()
  const trimmed = reason.trim()
  if (trimmed === '') throw invalidReason('must explain why the request is rejected')
  if (trimmed.length > REJECTION_REASON_MAX_LENGTH) {
    throw invalidReason('must be 1000 characters or fewer')
  }
  const request = pendingRequest(id)
  request.status = 'REJECTED'
  request.reviewedAt = new Date().toISOString()
  request.rejectionReason = trimmed
  return { id: request.id, status: 'REJECTED' }
}
