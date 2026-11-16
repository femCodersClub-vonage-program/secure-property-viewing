import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, it, expect } from 'vitest'
import PropertyCard from './PropertyCard'
import type { PropertySummary } from '../types'

const baseProperty: PropertySummary = {
  id: 7,
  title: 'Apartment in Gr\u00e0cia',
  operation: 'RENT',
  priceEuros: 950,
  area: 'Gr\u00e0cia',
  bedrooms: 2,
  sizeM2: 70,
  latitude: 41.4036,
  longitude: 2.1566,
  coverImage: {
    url: 'https://example.com/photo.jpg',
    altText: 'Bright living room with a balcony',
  },
  agency: { name: 'Test Agency', verified: true },
}

function renderCard(property: PropertySummary = baseProperty) {
  return render(
    <MemoryRouter>
      <PropertyCard property={property} />
    </MemoryRouter>,
  )
}

describe('PropertyCard', () => {
  it('shows the property title', () => {
    renderCard()
    expect(screen.getByRole('heading', { name: 'Apartment in Gr\u00e0cia' })).toBeInTheDocument()
  })

  it('shows the neighborhood', () => {
    renderCard()
    expect(screen.getByText('Gr\u00e0cia')).toBeInTheDocument()
  })

  it('formats a rent price', () => {
    renderCard()
    expect(screen.getByText(/950.*\u20ac\/month/)).toBeInTheDocument()
  })

  it('formats a sale price', () => {
    renderCard({ ...baseProperty, operation: 'SALE', priceEuros: 250000 })
    expect(screen.getByText(/250.*\u20ac/)).toBeInTheDocument()
  })

  it('shows bedrooms', () => {
    renderCard()
    expect(screen.getByText('2 beds')).toBeInTheDocument()
  })

  it('shows size', () => {
    renderCard()
    expect(screen.getByText('70 m\u00b2')).toBeInTheDocument()
  })

  it('shows the cover image with its alt text', () => {
    renderCard()
    const img = screen.getByRole('img', { name: 'Bright living room with a balcony' })
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg')
  })

  it('shows a generic image when coverImage is null', () => {
    renderCard({ ...baseProperty, coverImage: null })
    const img = screen.getByRole('img', { name: 'Property image not available' })
    expect(img).toHaveAttribute('src', '/images/property-placeholder.webp')
  })

  it('uses singular bed for one bedroom', () => {
    renderCard({ ...baseProperty, bedrooms: 1 })
    expect(screen.getByText('1 bed')).toBeInTheDocument()
  })

  it('shows verified agency badge when agency is verified', () => {
    renderCard()
    expect(screen.getByText(/Verified agency/)).toBeInTheDocument()
  })

  it('hides verified agency badge when agency is not verified', () => {
    renderCard({ ...baseProperty, agency: { name: 'Test Agency', verified: false } })
    expect(screen.queryByText(/Verified agency/)).not.toBeInTheDocument()
  })

  it('links to the visit request page', () => {
    renderCard()
    const link = screen.getByRole('link', { name: /request a video visit/i })
    expect(link).toHaveAttribute('href', '/properties/7/visit')
  })
})
