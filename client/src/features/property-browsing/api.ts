import { request } from '../../lib/http'
import type { Operation, PropertyDetail, PropertySummary } from './types'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseCoverImage(value: unknown): PropertySummary['coverImage'] {
  if (isObject(value) && typeof value.url === 'string' && typeof value.altText === 'string') {
    return { url: value.url, altText: value.altText }
  }
  return null
}

function parseAgency(value: unknown): PropertySummary['agency'] {
  if (isObject(value) && typeof value.name === 'string' && typeof value.verified === 'boolean') {
    return { name: value.name, verified: value.verified }
  }
  throw new Error('Invalid agency in property response')
}

export function parsePropertySummary(data: unknown): PropertySummary {
  if (
    isObject(data) &&
    typeof data.id === 'number' &&
    typeof data.title === 'string' &&
    (data.operation === 'RENT' || data.operation === 'SALE') &&
    typeof data.priceEuros === 'number' &&
    typeof data.area === 'string' &&
    typeof data.bedrooms === 'number' &&
    typeof data.sizeM2 === 'number'
  ) {
    return {
      id: data.id,
      title: data.title,
      operation: data.operation,
      priceEuros: data.priceEuros,
      area: data.area,
      bedrooms: data.bedrooms,
      sizeM2: data.sizeM2,
      latitude: typeof data.latitude === 'number' ? data.latitude : null,
      longitude: typeof data.longitude === 'number' ? data.longitude : null,
      coverImage: parseCoverImage(data.coverImage),
      agency: parseAgency(data.agency),
    }
  }
  throw new Error('Unexpected GET /api/properties response item')
}

export function parsePropertyDetail(data: unknown): PropertyDetail {
  if (
    isObject(data) &&
    (data.propertyType === 'APARTMENT' ||
      data.propertyType === 'HOUSE' ||
      data.propertyType === 'STUDIO') &&
    (data.floor === null || typeof data.floor === 'number') &&
    typeof data.description === 'string' &&
    typeof data.videoVisitAvailable === 'boolean' &&
    Array.isArray(data.images)
  ) {
    const summary = parsePropertySummary(data)
    const images: PropertyDetail['images'] = data.images.flatMap((img: unknown) =>
      isObject(img) && typeof img.url === 'string' && typeof img.altText === 'string'
        ? [{ url: img.url, altText: img.altText }]
        : [],
    )
    return {
      ...summary,
      propertyType: data.propertyType,
      floor: typeof data.floor === 'number' ? data.floor : null,
      description: data.description,
      videoVisitAvailable: data.videoVisitAvailable,
      images,
    }
  }
  throw new Error('Unexpected GET /api/properties/{id} response')
}

export function getProperties(
  operation?: Operation,
  signal?: AbortSignal,
): Promise<PropertySummary[]> {
  const path = operation ? `/api/properties?operation=${operation}` : '/api/properties'
  return request(
    path,
    (data) => {
      if (!Array.isArray(data)) throw new Error('Expected array from GET /api/properties')
      return data.map(parsePropertySummary)
    },
    { signal },
  )
}

export function getPropertyById(id: number, signal?: AbortSignal): Promise<PropertyDetail> {
  return request(`/api/properties/${id}`, parsePropertyDetail, { signal })
}
