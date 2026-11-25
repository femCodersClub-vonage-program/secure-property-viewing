import type { PropertySummary } from './types'

const euros = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 })

// Formatted for Spain, as the property browsing spec asks: "950 €/month"
function price(property: PropertySummary): string {
  const amount = `${euros.format(property.priceEuros)} €`
  return property.operation === 'RENT' ? `${amount}/month` : amount
}

function bedrooms(count: number): string {
  if (count === 0) return 'Studio'
  return count === 1 ? '1 bedroom' : `${count} bedrooms`
}

/** Such as "Gràcia · 950 €/month · 2 bedrooms". */
export function propertyLine(property: PropertySummary): string {
  return `${property.area} · ${price(property)} · ${bedrooms(property.bedrooms)}`
}
