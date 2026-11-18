import { describe, expect, it } from 'vitest'
import { formatPrice } from './price'

describe('formatPrice', () => {
  // Prices from the demo data, written as in Spain
  it('writes a rental per month, with no separator in four digits', () => {
    expect(formatPrice(1250, 'RENT')).toBe('1250 €/month')
    expect(formatPrice(950, 'RENT')).toBe('950 €/month')
  })

  it('writes a sale price with a thousands separator', () => {
    expect(formatPrice(395000, 'SALE')).toBe('395.000 €')
  })
})
