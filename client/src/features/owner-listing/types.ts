import type { Operation, PropertyType } from '../property-browsing'

// What the owner types in B2 and B3. Values stay as text, as the inputs give them,
// so an empty number field stays empty instead of becoming 0
export type ListingFormData = {
  ownerName: string
  ownerPhone: string
  title: string
  description: string
  propertyType: PropertyType | ''
  operation: Operation | ''
  area: string
  address: string
  priceEuros: string
  bedrooms: string
  sizeM2: string
  floor: string
}

/** The body of POST /api/listing-requests. `floor` is the only optional field. */
export type ListingRequest = {
  ownerName: string
  ownerPhone: string
  title: string
  description: string
  propertyType: PropertyType
  operation: Operation
  area: string
  address: string
  priceEuros: number
  bedrooms: number
  sizeM2: number
  floor?: number
  phoneVerificationId: number
}

/** The 201 response. */
export type SubmittedListingRequest = {
  id: number
  status: 'PENDING'
}

/** The three steps of the form, in order. */
export type ListingStep = 'details' | 'property' | 'verification'
