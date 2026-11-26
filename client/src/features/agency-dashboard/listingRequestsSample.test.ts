import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseListingRequestSummaries } from './api'
import type * as DetailsSample from './listingRequestDetailsSample'
import type * as ListSample from './listingRequestsSample'

// Both modules share the reviews in memory, so each test loads fresh copies of them together
let details: typeof DetailsSample
let list: typeof ListSample

beforeEach(async () => {
  vi.resetModules()
  details = await import('./listingRequestDetailsSample')
  list = await import('./listingRequestsSample')
})

describe('listing requests sample', () => {
  it.each(['PENDING', 'APPROVED', 'REJECTED'] as const)(
    'lists only the %s requests, in the shape of the API contract',
    async (status) => {
      const requests = await list.getListingRequests(status)

      expect(requests.length).toBeGreaterThan(0)
      expect(requests.every((request) => request.status === status)).toBe(true)
      expect(parseListingRequestSummaries(requests)).toEqual(requests)
    },
  )

  it('lists the newest requests first, as the server does', async () => {
    const pending = await list.getListingRequests('PENDING')

    expect(pending.map((request) => request.id)).toEqual([22, 21, 18])
  })

  it('moves a request reviewed in D3 to its new tab', async () => {
    await details.approveListingRequest(18)

    const pending = await list.getListingRequests('PENDING')
    const approved = await list.getListingRequests('APPROVED')
    expect(pending.map((request) => request.id)).not.toContain(18)
    expect(approved.map((request) => request.id)).toContain(18)
  })

  it('fails like fetch when the screen cancels the call', async () => {
    const controller = new AbortController()
    const call = list.getListingRequests('PENDING', controller.signal)

    controller.abort()

    await expect(call).rejects.toMatchObject({ name: 'AbortError' })
  })
})
