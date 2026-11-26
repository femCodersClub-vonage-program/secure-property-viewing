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

// One request in each status, and several pending ones, the status a new request starts in
const requests: ListingRequestDetails[] = [
  {
    id: 18,
    status: 'PENDING',
    ownerName: 'Ana Torres',
    ownerPhone: '+34600000000',
    title: 'Apartment in Gràcia',
    description: 'Bright apartment with a balcony over a quiet street, two minutes from the metro.',
    propertyType: 'APARTMENT',
    operation: 'RENT',
    area: 'Gràcia',
    address: 'Carrer de Verdi 12',
    priceEuros: 1200,
    bedrooms: 3,
    sizeM2: 85,
    floor: 2,
    createdAt: '2026-11-10T11:00:00+01:00',
    reviewedAt: null,
    rejectionReason: null,
  },
  {
    id: 19,
    status: 'APPROVED',
    ownerName: 'Marc Vidal',
    ownerPhone: '+34600000001',
    title: 'House in Sarrià',
    description: 'Family house with a garden and a garage, close to the schools of the area.',
    propertyType: 'HOUSE',
    operation: 'SALE',
    area: 'Sarrià',
    address: 'Carrer Major de Sarrià 40',
    priceEuros: 650000,
    bedrooms: 5,
    sizeM2: 210,
    floor: null,
    createdAt: '2026-11-05T09:15:00+01:00',
    reviewedAt: '2026-11-06T12:00:00+01:00',
    rejectionReason: null,
  },
  {
    id: 20,
    status: 'REJECTED',
    ownerName: 'Lucía Romero',
    ownerPhone: '+34600000002',
    title: 'Studio in Raval',
    description: 'Small studio with a kitchenette, renovated last year.',
    propertyType: 'STUDIO',
    operation: 'RENT',
    area: 'Raval',
    address: 'Carrer de la Riera Baixa 3',
    priceEuros: 750,
    bedrooms: 0,
    sizeM2: 28,
    floor: 1,
    createdAt: '2026-11-03T16:40:00+01:00',
    reviewedAt: '2026-11-04T10:30:00+01:00',
    rejectionReason: 'The address does not match the building in the photos.',
  },
  {
    id: 21,
    status: 'PENDING',
    ownerName: 'Jordi Puig',
    ownerPhone: '+34600000003',
    title: 'Studio near Sagrada Família',
    description: 'Quiet interior studio with a lift, furnished and ready to move in.',
    propertyType: 'STUDIO',
    operation: 'RENT',
    area: 'Eixample',
    address: 'Carrer de Provença 450',
    priceEuros: 850,
    bedrooms: 0,
    sizeM2: 32,
    floor: 4,
    createdAt: '2026-11-24T10:05:00+01:00',
    reviewedAt: null,
    rejectionReason: null,
  },
  {
    id: 22,
    status: 'PENDING',
    ownerName: 'Carmen Ruiz',
    ownerPhone: '+34600000004',
    title: 'House with garden in Horta',
    description: 'Two-storey house with a garden and a terrace looking at the hills.',
    propertyType: 'HOUSE',
    operation: 'SALE',
    area: 'Horta',
    address: 'Carrer de Feliu i Codina 8',
    priceEuros: 495000,
    bedrooms: 4,
    sizeM2: 160,
    floor: null,
    createdAt: '2026-11-25T18:20:00+01:00',
    reviewedAt: null,
    rejectionReason: null,
  },
]

// The first ids the seed does not use, so a new property never looks like an existing one
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
