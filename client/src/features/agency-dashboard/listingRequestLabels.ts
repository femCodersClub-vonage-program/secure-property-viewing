import type { Operation, PropertyType } from '../property-browsing'

// The words D2 and D3 show for the values of the listing request contract
export const OPERATION_LABEL: Record<Operation, string> = { RENT: 'Rent', SALE: 'Sale' }

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  APARTMENT: 'Apartment',
  HOUSE: 'House',
  STUDIO: 'Studio',
}
