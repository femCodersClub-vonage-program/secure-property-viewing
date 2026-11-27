import { describe, expect, it } from 'vitest'
import { EMPTY_FORM, fromServerErrors, readSavedListingForm, toListingRequest } from './listingForm'
import type { ListingFormData } from './types'

const filledForm: ListingFormData = {
  ownerName: 'Ana Torres',
  ownerPhone: '612 987 654',
  title: 'Apartment in Gràcia',
  description: 'Bright apartment with a balcony.',
  propertyType: 'APARTMENT',
  operation: 'RENT',
  area: 'Gràcia',
  address: 'Carrer de Verdi, 123',
  priceEuros: '1200',
  bedrooms: '3',
  sizeM2: '85',
  floor: '2',
}

const verified = { verificationId: 42, phone: '+34612987654' }

describe('toListingRequest', () => {
  it('builds the body of the spec, with numbers, trimmed text and the verification', () => {
    const request = toListingRequest({ ...filledForm, title: '  Apartment in Gràcia ' }, verified)

    expect(request).toEqual({
      ownerName: 'Ana Torres',
      ownerPhone: '+34612987654',
      title: 'Apartment in Gràcia',
      description: 'Bright apartment with a balcony.',
      propertyType: 'APARTMENT',
      operation: 'RENT',
      area: 'Gràcia',
      address: 'Carrer de Verdi, 123',
      priceEuros: 1200,
      bedrooms: 3,
      sizeM2: 85,
      floor: 2,
      phoneVerificationId: 42,
    })
  })

  it('sends the verified number, not the one typed in B2', () => {
    const request = toListingRequest({ ...filledForm, ownerPhone: '600 111 222' }, verified)

    expect(request?.ownerPhone).toBe('+34612987654')
  })

  it('leaves the floor out of the body when it is empty', () => {
    const request = toListingRequest({ ...filledForm, floor: '' }, verified)

    // What travels to the server is the JSON, so that is what is checked
    expect(JSON.stringify(request)).not.toContain('floor')
  })

  it('returns nothing while a choice is still empty', () => {
    expect(toListingRequest({ ...filledForm, operation: '' }, verified)).toBeUndefined()
  })
})

describe('fromServerErrors', () => {
  it('keeps the errors of form fields and drops the rest', () => {
    const errors = fromServerErrors({
      priceEuros: 'must be greater than 0',
      phoneVerificationId: 'must not be null',
    })

    expect(errors).toEqual({ priceEuros: 'must be greater than 0' })
  })
})

describe('readSavedListingForm', () => {
  it('reads back a form saved on B4', () => {
    // The browser keeps it as JSON, so it comes back as unknown
    const saved: unknown = JSON.parse(JSON.stringify(filledForm))

    expect(readSavedListingForm(saved)).toEqual(filledForm)
  })

  it.each([
    { label: 'nothing', saved: undefined },
    { label: 'plain text', saved: 'hello' },
    { label: 'the empty form', saved: EMPTY_FORM },
    { label: 'a number where text goes', saved: { ...filledForm, priceEuros: 1200 } },
    { label: 'an unknown property type', saved: { ...filledForm, propertyType: 'CASTLE' } },
    { label: 'a missing field', saved: { ...filledForm, title: undefined } },
  ])('ignores $label', ({ saved }) => {
    expect(readSavedListingForm(saved)).toBeUndefined()
  })
})
