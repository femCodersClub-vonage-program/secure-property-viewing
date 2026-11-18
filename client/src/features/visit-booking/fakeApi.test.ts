import { describe, expect, it } from 'vitest'
import { parseBookedVisit, parseProperty, parseSlots } from './api'
import { addDays, madridDay, madridTime } from './calendar'
import { fakeVisitBookingAnswer } from './fakeApi'

// A Tuesday morning in Madrid
const NOW = new Date('2026-11-17T09:00:00+01:00')

function keysOf(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) throw new Error('Not an object')
  return Object.keys(value).sort()
}

async function answer(path: string, method = 'GET', body?: unknown) {
  const response = fakeVisitBookingAnswer(path, method, body, NOW)
  if (!response) throw new Error(`No fake answer for ${method} ${path}`)
  const data: unknown = await response.json()
  return { status: response.status, data }
}

// The fake has to keep the shapes of the visit booking spec, or the screen would break on the real API
describe('fake visit booking API', () => {
  it('answers the property and its slots with the shapes of the spec', async () => {
    const property = await answer('/api/properties/7')
    expect(property.status).toBe(200)
    expect(parseProperty(property.data).title).toBe('Bright apartment in Gràcia')

    const slots = await answer('/api/properties/7/slots')
    const parsed = parseSlots(slots.data)
    expect(parsed.length).toBeGreaterThan(0)
    for (const slot of parsed) {
      expect(new Date(slot.startsAt) > NOW).toBe(true)
      expect(madridDay(slot.startsAt) <= addDays('2026-11-17', 14)).toBe(true)
    }
  })

  it('answers with exactly the fields of the spec examples, not only the ones the screen reads', async () => {
    // Keys of the examples in specs/property-browsing.md and specs/visit-booking.md
    const propertyKeys = [
      'agency',
      'area',
      'bedrooms',
      'description',
      'floor',
      'id',
      'images',
      'operation',
      'priceEuros',
      'propertyType',
      'sizeM2',
      'title',
      'videoVisitAvailable',
    ]
    const property = await answer('/api/properties/7')
    expect(keysOf(property.data)).toEqual(propertyKeys)

    const slots = await answer('/api/properties/7/slots')
    if (!Array.isArray(slots.data)) throw new Error('The slots are not a list')
    for (const slot of slots.data) {
      expect(keysOf(slot)).toEqual(['endsAt', 'id', 'startsAt'])
    }
  })

  it('answers 404 for a property that does not exist', async () => {
    const missing = await answer('/api/properties/999')
    expect(missing).toMatchObject({ status: 404, data: { code: 'NOT_FOUND' } })
  })

  it('books a free slot once, and answers 409 the second time', async () => {
    const slots = parseSlots((await answer('/api/properties/7/slots')).data)
    const slot = slots.find((free) => madridTime(free.startsAt) === '10:00')
    if (!slot) throw new Error('The fake has no 10:00 slot')
    const body = JSON.stringify({
      slotId: slot.id,
      visitorName: 'Laura Gómez',
      phone: '+34600000000',
      phoneVerificationId: 42,
    })

    const booked = await answer('/api/visits', 'POST', body)
    expect(booked.status).toBe(201)
    expect(parseBookedVisit(booked.data).visitorName).toBe('Laura Gómez')

    const again = await answer('/api/visits', 'POST', body)
    expect(again).toMatchObject({ status: 409, data: { code: 'SLOT_UNAVAILABLE' } })
  })

  it('always answers 409 at 11:30, so the taken path can be tried by hand', async () => {
    const slots = parseSlots((await answer('/api/properties/7/slots')).data)
    const slot = slots.find((free) => madridTime(free.startsAt) === '11:30')
    if (!slot) throw new Error('The fake has no 11:30 slot')
    const body = JSON.stringify({
      slotId: slot.id,
      visitorName: 'Laura',
      phone: '+34600000000',
      phoneVerificationId: 1,
    })

    expect(await answer('/api/visits', 'POST', body)).toMatchObject({ status: 409 })
  })

  it('answers room links with the shape of the video visit spec, up to 4 guest links', async () => {
    const visitor = await answer('/api/visits/18/room-links', 'POST', '{"role":"VISITOR"}')
    expect(visitor.status).toBe(201)
    expect(keysOf(visitor.data)).toEqual(['role', 'token'])

    for (let link = 0; link < 4; link++) {
      expect((await answer('/api/visits/18/room-links', 'POST', '{"role":"GUEST"}')).status).toBe(
        201,
      )
    }
    expect(await answer('/api/visits/18/room-links', 'POST', '{"role":"GUEST"}')).toMatchObject({
      status: 409,
      data: { code: 'VIDEO_INVITE_LIMIT_REACHED' },
    })
  })

  it('leaves every other call to the real server', () => {
    expect(fakeVisitBookingAnswer('/api/health', 'GET', undefined, NOW)).toBeUndefined()
    expect(fakeVisitBookingAnswer('/api/phone-verifications', 'POST', '{}', NOW)).toBeUndefined()
  })
})
