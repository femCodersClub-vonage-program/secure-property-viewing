import { describe, expect, it } from 'vitest'
import { formatBedrooms } from './bedrooms'

describe('formatBedrooms', () => {
  it.each([
    [0, 'bed', 'Studio'],
    [1, 'bed', '1 bed'],
    [2, 'bed', '2 beds'],
    [0, 'bedroom', 'Studio'],
    [1, 'bedroom', '1 bedroom'],
    [3, 'bedroom', '3 bedrooms'],
  ] as const)('%i %s is "%s"', (bedrooms, unit, label) => {
    expect(formatBedrooms(bedrooms, unit)).toBe(label)
  })
})
