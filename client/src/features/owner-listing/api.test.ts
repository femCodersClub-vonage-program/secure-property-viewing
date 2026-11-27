import { describe, expect, it } from 'vitest'
import { parseSubmittedListingRequest } from './api'

describe('parseSubmittedListingRequest', () => {
  it('reads the 201 response of the spec', () => {
    expect(parseSubmittedListingRequest({ id: 12, status: 'PENDING' })).toEqual({
      id: 12,
      status: 'PENDING',
    })
  })

  it.each([
    { label: 'an empty body', data: null },
    { label: 'an id as text', data: { id: '12', status: 'PENDING' } },
    { label: 'another status', data: { id: 12, status: 'APPROVED' } },
  ])('rejects $label', ({ data }) => {
    expect(() => parseSubmittedListingRequest(data)).toThrow()
  })
})
