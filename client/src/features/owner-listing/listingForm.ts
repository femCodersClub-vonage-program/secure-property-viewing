import type { VerifiedPhone } from '../phone-verification'
import type { ListingFormData, ListingRequest } from './types'
import type { ListingFieldErrors } from './validation'

// Every field starts empty, floor included
export const EMPTY_FORM: ListingFormData = {
  ownerName: '',
  ownerPhone: '',
  title: '',
  description: '',
  propertyType: '',
  operation: '',
  area: '',
  address: '',
  priceEuros: '',
  bedrooms: '',
  sizeM2: '',
  floor: '',
}

/** The fields of B2. Any other field belongs to B3. */
export const OWNER_FIELDS: (keyof ListingFormData)[] = ['ownerName', 'ownerPhone']

function isFormField(name: string): name is keyof ListingFormData {
  return name in EMPTY_FORM
}

/** The server's field errors, keeping only the ones the form can show next to a field. */
export function fromServerErrors(fieldErrors: Record<string, string>): ListingFieldErrors {
  const errors: ListingFieldErrors = {}
  for (const [field, message] of Object.entries(fieldErrors)) {
    if (isFormField(field)) errors[field] = message
  }
  return errors
}

/**
 * The form as POST /api/listing-requests expects it. B2 and B3 are already valid here,
 * so undefined only happens if a choice is still empty.
 */
export function toListingRequest(
  data: ListingFormData,
  verified: VerifiedPhone,
): ListingRequest | undefined {
  const { propertyType, operation } = data
  // Already checked in B3; this also tells TypeScript they are no longer ''
  if (propertyType === '' || operation === '') return undefined

  return {
    ownerName: data.ownerName.trim(),
    // The verified number in E.164: the server checks it is the same one it verified
    ownerPhone: verified.phone,
    title: data.title.trim(),
    description: data.description.trim(),
    propertyType,
    operation,
    area: data.area.trim(),
    address: data.address.trim(),
    priceEuros: Number(data.priceEuros),
    bedrooms: Number(data.bedrooms),
    sizeM2: Number(data.sizeM2),
    floor: data.floor.trim() === '' ? undefined : Number(data.floor),
    phoneVerificationId: verified.verificationId,
  }
}
