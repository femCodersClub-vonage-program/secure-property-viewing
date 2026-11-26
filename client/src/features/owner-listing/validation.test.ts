import { describe, expect, it } from 'vitest'
import type { ListingFormData } from './types'
import { toE164Phone, validateOwnerDetails, validatePropertyDetails } from './validation'

// A form that passes B2 and B3, so each test changes only the field it checks
const validForm: ListingFormData = {
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

describe('toE164Phone', () => {
  it.each([
    ['612 987 654', '+34612987654'],
    ['612-987-654', '+34612987654'],
    ['0034612987654', '+34612987654'],
    ['+44 7700 900123', '+447700900123'],
  ])('turns %s into %s', (typed, expected) => {
    expect(toE164Phone(typed)).toBe(expected)
  })

  it.each(['', '12345', '512987654', '+0612987654', '612abc654'])('rejects "%s"', (typed) => {
    expect(toE164Phone(typed)).toBeUndefined()
  })
})

describe('validateOwnerDetails', () => {
  it('accepts a full name and a valid phone', () => {
    expect(validateOwnerDetails(validForm)).toEqual({})
  })

  it('asks for both fields when they are empty', () => {
    const errors = validateOwnerDetails({ ...validForm, ownerName: ' ', ownerPhone: '' })

    expect(errors.ownerName).toBe('Enter your full name.')
    expect(errors.ownerPhone).toMatch(/Spanish number/)
  })

  it.each(['María José', "O'Connor", 'Anne-Marie', 'J. García'])('accepts the name %s', (name) => {
    expect(validateOwnerDetails({ ...validForm, ownerName: name })).toEqual({})
  })

  it.each(['Ana 123', 'Ana@home'])('rejects the name %s', (name) => {
    expect(validateOwnerDetails({ ...validForm, ownerName: name }).ownerName).toBe(
      'Use only letters in your name, without numbers or symbols.',
    )
  })
})

describe('validatePropertyDetails', () => {
  it('accepts a complete property', () => {
    expect(validatePropertyDetails(validForm)).toEqual({})
  })

  it('accepts a studio with 0 bedrooms and no floor', () => {
    const studio = { ...validForm, propertyType: 'STUDIO', bedrooms: '0', floor: '' } as const

    expect(validatePropertyDetails(studio)).toEqual({})
  })

  it('accepts a basement as floor -1', () => {
    expect(validatePropertyDetails({ ...validForm, floor: '-1' })).toEqual({})
  })

  it('asks to choose the property type and the operation', () => {
    const errors = validatePropertyDetails({ ...validForm, propertyType: '', operation: '' })

    expect(errors.propertyType).toBe('Choose the property type.')
    expect(errors.operation).toBe('Choose rent or sale.')
  })

  it.each(['', '0', '-5', '1200.50', 'abc'])('rejects the price "%s"', (price) => {
    expect(validatePropertyDetails({ ...validForm, priceEuros: price }).priceEuros).toBe(
      'Enter a price greater than 0, in whole euros.',
    )
  })

  it('rejects a size of 0, more than 50 bedrooms and a floor above 100', () => {
    const errors = validatePropertyDetails({
      ...validForm,
      sizeM2: '0',
      bedrooms: '51',
      floor: '101',
    })

    expect(Object.keys(errors).sort()).toEqual(['bedrooms', 'floor', 'sizeM2'])
  })

  it('rejects a description longer than 5,000 characters', () => {
    const errors = validatePropertyDetails({ ...validForm, description: 'a'.repeat(5001) })

    expect(errors.description).toBe('Shorten a description to 5000 characters or fewer.')
  })
})
