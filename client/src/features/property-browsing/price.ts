import type { Operation } from './types'

/**
 * Such as '1250 €/month' for a rental or '395.000 €' for a sale, written as in Spain, where a
 * four-digit number has no thousands separator. Shared by the property card and the map.
 */
export function formatPrice(priceEuros: number, operation: Operation): string {
  const formatted = new Intl.NumberFormat('es-ES').format(priceEuros)
  return operation === 'RENT' ? `${formatted} €/month` : `${formatted} €`
}
