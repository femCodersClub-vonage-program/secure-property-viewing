import type { Operation, PropertySummary } from './types'

const PER_OPERATION = 2

/** The first two rentals and the first two sales with a photo, so the home page shows both. */
export function pickFeatured(properties: PropertySummary[]): PropertySummary[] {
  const firstOf = (operation: Operation) =>
    properties
      .filter((property) => property.operation === operation && property.coverImage !== null)
      .slice(0, PER_OPERATION)

  return [...firstOf('RENT'), ...firstOf('SALE')]
}
