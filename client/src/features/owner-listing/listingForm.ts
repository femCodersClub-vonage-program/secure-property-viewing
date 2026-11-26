import type { VerifiedPhone } from '../phone-verification'
import type { ListingFormData, ListingRequest } from './types'
import type { Operation, PropertyType } from '../property-browsing'
import {
  validateOwnerDetails,
  validatePropertyDetails,
  type ListingFieldErrors,
} from './validation'
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

const PROPERTY_TYPES: (PropertyType | '')[] = ['', 'APARTMENT', 'HOUSE', 'STUDIO']
const OPERATIONS: (Operation | '')[] = ['', 'RENT', 'SALE']

function isPropertyType(value: string): value is PropertyType | '' {
  return PROPERTY_TYPES.some((type) => type === value)
}

function isOperation(value: string): value is Operation | '' {
  return OPERATIONS.some((operation) => operation === value)
}

/**
 * The form saved before the silent check reloaded the page, or undefined when it is missing,
 * broken or incomplete. It never holds the SMS code.
 */
export function readSavedListingForm(saved: unknown): ListingFormData | undefined {
  if (typeof saved !== 'object' || saved === null) return undefined

  // unknown, not any: every value is checked before it is used
  const values = new Map<string, unknown>(Object.entries(saved))
  const allText = Object.keys(EMPTY_FORM).every((field) => typeof values.get(field) === 'string')
  if (!allText) return undefined

  // Every field is text now, so String() only gives it its type
  const text = (field: keyof ListingFormData) => String(values.get(field))
  const propertyType = text('propertyType')
  const operation = text('operation')
  if (!isPropertyType(propertyType) || !isOperation(operation)) return undefined

  const form: ListingFormData = {
    ownerName: text('ownerName'),
    ownerPhone: text('ownerPhone'),
    title: text('title'),
    description: text('description'),
    propertyType,
    operation,
    area: text('area'),
    address: text('address'),
    priceEuros: text('priceEuros'),
    bedrooms: text('bedrooms'),
    sizeM2: text('sizeM2'),
    floor: text('floor'),
  }

  // It was saved on B4, so B2 and B3 were valid: anything else is an old or edited entry
  const errors = { ...validateOwnerDetails(form), ...validatePropertyDetails(form) }
  return Object.keys(errors).length === 0 ? form : undefined
}
