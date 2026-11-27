import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Api from './api'
import type * as Sample from './listingRequestDetailsSample'

// The samples keep the reviews in memory, so each test starts from fresh copies of the modules.
// api.ts is loaded again too: after resetModules the sample throws the ApiError of a new lib/http.ts,
// and the checks in api.ts only recognize it if they come from that same copy
let api: typeof Api
let sample: typeof Sample

beforeEach(async () => {
  vi.resetModules()
  api = await import('./api')
  sample = await import('./listingRequestDetailsSample')
})

describe('listing request details sample', () => {
  it('has the shape of the API contract, with one request in each status', () => {
    const requests = sample.sampleListingRequests()

    for (const request of requests) {
      expect(api.parseListingRequestDetails(request)).toEqual(request)
    }
    expect(new Set(requests.map((request) => request.status))).toEqual(
      new Set(['PENDING', 'APPROVED', 'REJECTED']),
    )
  })

  it('answers one request by its id', async () => {
    await expect(sample.getListingRequest(900001)).resolves.toMatchObject({
      id: 900001,
      title: 'Bright flat near Plaça del Sol',
      status: 'PENDING',
    })
  })

  it('answers 404 for an unknown request, with the server message', async () => {
    const error: unknown = await sample.getListingRequest(999).catch((caught: unknown) => caught)

    expect(api.isNotFound(error)).toBe(true)
    expect(api.errorMessage(error)).toBe('The listing request does not exist.')
  })

  it('fails like fetch when the screen cancels the call', async () => {
    const controller = new AbortController()
    const call = sample.getListingRequest(900001, controller.signal)

    controller.abort()

    await expect(call).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('approves a pending request once, and answers 409 the second time', async () => {
    await expect(sample.approveListingRequest(900001)).resolves.toEqual({
      propertyId: expect.any(Number),
    })

    const approved = await sample.getListingRequest(900001)
    expect(approved.status).toBe('APPROVED')
    expect(approved.reviewedAt).not.toBeNull()

    const error: unknown = await sample
      .approveListingRequest(900001)
      .catch((caught: unknown) => caught)
    expect(api.isAlreadyReviewed(error)).toBe(true)
    expect(api.errorMessage(error)).toBe(
      'The listing request has already been approved or rejected.',
    )
  })

  it('rejects a pending request with the trimmed reason, and answers 409 the second time', async () => {
    await expect(sample.rejectListingRequest(900002, '  Duplicated listing  ')).resolves.toEqual({
      id: 900002,
      status: 'REJECTED',
    })

    const rejected = await sample.getListingRequest(900002)
    expect(rejected).toMatchObject({ status: 'REJECTED', rejectionReason: 'Duplicated listing' })
    expect(rejected.reviewedAt).not.toBeNull()

    const error: unknown = await sample
      .rejectListingRequest(900002, 'Again')
      .catch((caught: unknown) => caught)
    expect(api.isAlreadyReviewed(error)).toBe(true)
  })

  it('refuses a blank reason and leaves the request pending', async () => {
    const error: unknown = await sample
      .rejectListingRequest(900001, '   ')
      .catch((caught: unknown) => caught)

    expect(api.isInvalidReason(error)).toBe(true)
    await expect(sample.getListingRequest(900001)).resolves.toMatchObject({ status: 'PENDING' })
  })

  it('refuses a reason longer than the server accepts', async () => {
    const tooLong = 'x'.repeat(api.REJECTION_REASON_MAX_LENGTH + 1)

    const error: unknown = await sample
      .rejectListingRequest(900001, tooLong)
      .catch((caught: unknown) => caught)

    expect(api.isInvalidReason(error)).toBe(true)
  })

  it('accepts the longest reason once the spaces around it are trimmed', async () => {
    const longest = 'x'.repeat(api.REJECTION_REASON_MAX_LENGTH)

    await sample.rejectListingRequest(900001, `  ${longest} `)

    await expect(sample.getListingRequest(900001)).resolves.toMatchObject({
      rejectionReason: longest,
    })
  })
})
