import { describe, expect, it } from 'vitest'
import { readConfirmationState } from './confirmationState'

const visit = {
  visitId: 18,
  startsAt: '2026-11-23T10:00:00Z',
  endsAt: '2026-11-23T10:30:00Z',
  visitorName: 'Laura Gómez',
  property: { title: 'Bright apartment in Gràcia', area: 'Gràcia', address: 'Address 01' },
}
const photo = { url: '/properties/property-01-cover.webp', altText: 'Bright bedroom' }

describe('readConfirmationState', () => {
  it('reads the visit, its photo and whether the links were created', () => {
    expect(readConfirmationState({ visit, photo, roomLinksCreated: true })).toEqual({
      visit,
      photo,
      roomLinksCreated: true,
    })
  })

  it.each([undefined, null, 'photo', { url: 1, altText: 'Bright bedroom' }, { url: '/a.webp' }])(
    'keeps the visit without a photo when the photo is %j',
    (broken) => {
      expect(readConfirmationState({ visit, photo: broken })).toEqual({
        visit,
        photo: undefined,
        roomLinksCreated: false,
      })
    },
  )
})
