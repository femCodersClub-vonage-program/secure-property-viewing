import type { ListingFormData } from './types'

/** One message per invalid field, keyed with the same names the server uses. */
export type ListingFieldErrors = Partial<Record<keyof ListingFormData, string>>
// The same limits the server checks, from the spec
export const MAX_LENGTH = {
  ownerName: 100,
  title: 255,
  description: 5000,
  area: 100,
  address: 255,
} as const

// A Spanish number typed without prefix: 9 digits starting with 6, 7, 8 or 9
const SPANISH_NUMBER = /^[6-9]\d{8}$/
// E.164, the same rule as the server: + and 7 to 15 digits, never starting with 0
const E164_NUMBER = /^\+[1-9]\d{6,14}$/
// Letters in any language (\p{L}, with accents as \p{M}), spaces, hyphens, apostrophes and dots.
// Phones often type the typographic apostrophe ’ (U+2019) instead of '
const NAME_CHARACTERS = /^[\p{L}\p{M}\s'\u2019.-]+$/u

/** The phone in E.164, such as +34612987654, or undefined when it is not valid. */
export function toE164Phone(value: string): string | undefined {
  // People type spaces, dashes, dots or brackets, and sometimes 00 instead of +
  const phone = value.replace(/[\s\-().]/g, '').replace(/^00/, '+')
  if (SPANISH_NUMBER.test(phone)) {
    return `+34${phone}`
  }
  return E164_NUMBER.test(phone) ? phone : undefined
}

// The message for a required text field, or undefined when it is fine
function checkText(value: string, maxLength: number, label: string): string | undefined {
  const text = value.trim()
  if (text === '') {
    return `Enter ${label}.`
  }
  if (text.length > maxLength) {
    return `Shorten ${label} to ${maxLength} characters or fewer.`
  }
  return undefined
}

// Number('') is 0, so an empty field has to be checked first
function isWholeNumberBetween(value: string, min: number, max = Number.MAX_SAFE_INTEGER): boolean {
  const number = Number(value)
  return value.trim() !== '' && Number.isInteger(number) && number >= min && number <= max
}

/** B2: the owner's details. */
export function validateOwnerDetails(data: ListingFormData): ListingFieldErrors {
  const errors: ListingFieldErrors = {}

  const ownerName = checkText(data.ownerName, MAX_LENGTH.ownerName, 'your full name')
  if (ownerName) {
    errors.ownerName = ownerName
  } else if (!NAME_CHARACTERS.test(data.ownerName.trim())) {
    errors.ownerName = 'Use only letters in your name, without numbers or symbols.'
  }

  if (!toE164Phone(data.ownerPhone)) {
    errors.ownerPhone =
      'Enter a Spanish number, such as 612 987 654, or an international one starting with +.'
  }
  return errors
}

/** B3: the property's details. Floor is the only optional field. */
export function validatePropertyDetails(data: ListingFormData): ListingFieldErrors {
  const errors: ListingFieldErrors = {}

  const title = checkText(data.title, MAX_LENGTH.title, 'a title')
  if (title) errors.title = title

  const description = checkText(data.description, MAX_LENGTH.description, 'a description')
  if (description) errors.description = description

  const area = checkText(data.area, MAX_LENGTH.area, 'the neighborhood')
  if (area) errors.area = area

  const address = checkText(data.address, MAX_LENGTH.address, 'the address')
  if (address) errors.address = address

  if (data.propertyType === '') errors.propertyType = 'Choose the property type.'
  if (data.operation === '') errors.operation = 'Choose rent or sale.'

  if (!isWholeNumberBetween(data.priceEuros, 1)) {
    errors.priceEuros = 'Enter a price greater than 0, in whole euros.'
  }
  if (!isWholeNumberBetween(data.bedrooms, 0, 50)) {
    errors.bedrooms = 'Enter a whole number of bedrooms from 0 to 50. A studio has 0.'
  }
  if (!isWholeNumberBetween(data.sizeM2, 1)) {
    errors.sizeM2 = 'Enter the size in whole square meters, greater than 0.'
  }
  // Optional: only checked when the owner wrote something
  if (data.floor.trim() !== '' && !isWholeNumberBetween(data.floor, -5, 100)) {
    errors.floor = 'Enter a floor from -5 to 100, or leave it empty.'
  }
  return errors
}
