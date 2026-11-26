import { describe, expect, it } from 'vitest'
import { pickFeatured } from './featured'
import type { Operation, PropertySummary } from './types'

function property(id: number, operation: Operation, hasPhoto = true): PropertySummary {
  return {
    id,
    title: `Property ${id}`,
    operation,
    priceEuros: 1000,
    area: 'Gràcia',
    bedrooms: 2,
    sizeM2: 70,
    coverImage: hasPhoto ? { url: `/${id}.webp`, altText: `Photo ${id}` } : null,
    agency: { name: 'Test Agency', verified: true },
  }
}

const featuredIds = (properties: PropertySummary[]) => pickFeatured(properties).map(({ id }) => id)

describe('pickFeatured', () => {
  it('picks the first two rentals and then the first two sales', () => {
    expect(
      featuredIds([
        property(1, 'SALE'),
        property(2, 'RENT'),
        property(3, 'RENT'),
        property(4, 'RENT'),
        property(5, 'SALE'),
        property(6, 'SALE'),
      ]),
    ).toEqual([2, 3, 1, 5])
  })

  it('skips the properties without a photo', () => {
    expect(featuredIds([property(1, 'RENT', false), property(2, 'RENT')])).toEqual([2])
  })

  it('returns what there is when one operation has none', () => {
    expect(featuredIds([property(1, 'SALE')])).toEqual([1])
  })
})
