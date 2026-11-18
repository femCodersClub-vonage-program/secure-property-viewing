import { request } from '../../lib/http'
import type { BookedVisit, PropertySummary, Slot, VisitRequest } from './types'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseImages(value: unknown): PropertySummary['images'] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((image: unknown) =>
    isObject(image) && typeof image.url === 'string' && typeof image.altText === 'string'
      ? [{ url: image.url, altText: image.altText }]
      : [],
  )
}

export function parseProperty(data: unknown): PropertySummary {
  if (
    isObject(data) &&
    typeof data.id === 'number' &&
    typeof data.title === 'string' &&
    (data.operation === 'RENT' || data.operation === 'SALE') &&
    typeof data.priceEuros === 'number' &&
    typeof data.area === 'string' &&
    typeof data.bedrooms === 'number' &&
    isObject(data.agency) &&
    typeof data.agency.name === 'string' &&
    typeof data.agency.verified === 'boolean'
  ) {
    return {
      id: data.id,
      title: data.title,
      operation: data.operation,
      priceEuros: data.priceEuros,
      area: data.area,
      bedrooms: data.bedrooms,
      agency: { name: data.agency.name, verified: data.agency.verified },
      images: parseImages(data.images),
    }
  }
  throw new Error('Unexpected GET /api/properties/{id} response')
}

function parseSlot(value: unknown): Slot {
  if (
    isObject(value) &&
    typeof value.id === 'number' &&
    typeof value.startsAt === 'string' &&
    typeof value.endsAt === 'string'
  ) {
    return { id: value.id, startsAt: value.startsAt, endsAt: value.endsAt }
  }
  throw new Error('Unexpected slot in GET /api/properties/{id}/slots')
}

export function parseSlots(data: unknown): Slot[] {
  if (!Array.isArray(data)) {
    throw new Error('Unexpected GET /api/properties/{id}/slots response')
  }
  return data.map(parseSlot)
}

export function parseBookedVisit(data: unknown): BookedVisit {
  if (
    isObject(data) &&
    typeof data.visitId === 'number' &&
    typeof data.startsAt === 'string' &&
    typeof data.endsAt === 'string' &&
    typeof data.visitorName === 'string' &&
    isObject(data.property) &&
    typeof data.property.title === 'string' &&
    typeof data.property.area === 'string' &&
    typeof data.property.address === 'string'
  ) {
    return {
      visitId: data.visitId,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      visitorName: data.visitorName,
      property: {
        title: data.property.title,
        area: data.property.area,
        address: data.property.address,
      },
    }
  }
  throw new Error('Unexpected POST /api/visits response')
}

/** The booked visit kept in the browser history, or undefined when it is missing or broken. */
export function readBookedVisit(data: unknown): BookedVisit | undefined {
  try {
    return parseBookedVisit(data)
  } catch {
    return undefined
  }
}

export function getProperty(id: number, signal?: AbortSignal): Promise<PropertySummary> {
  return request(`/api/properties/${id}`, parseProperty, { signal })
}

/** The free slots of the next 14 days: the server sets the range when none is given. */
export function getSlots(propertyId: number, signal?: AbortSignal): Promise<Slot[]> {
  return request(`/api/properties/${propertyId}/slots`, parseSlots, { signal })
}

export function bookVisit(visit: VisitRequest): Promise<BookedVisit> {
  return request('/api/visits', parseBookedVisit, {
    method: 'POST',
    body: JSON.stringify(visit),
  })
}
