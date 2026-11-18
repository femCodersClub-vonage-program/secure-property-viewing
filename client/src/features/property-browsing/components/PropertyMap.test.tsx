import { fireEvent, render, screen, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
// Through the feature's index.ts, as the catalog page will import it
import { PropertyMap, type PropertySummary } from '..'

// Shaped as in specs/property-browsing.md, "API". The last one comes from a listing request, so
// it has no coordinates and no photo, like property 22 of the demo data
const properties: PropertySummary[] = [
  {
    id: 7,
    title: 'Apartment in Gràcia',
    operation: 'RENT',
    priceEuros: 950,
    area: 'Gràcia',
    bedrooms: 2,
    sizeM2: 70,
    latitude: 41.4036,
    longitude: 2.1566,
    coverImage: { url: '/properties/property-01-cover.webp', altText: 'Bright living room' },
    agency: { name: 'Demo agency', verified: true },
  },
  {
    id: 11,
    title: 'Apartment near Arc de Triomf',
    operation: 'SALE',
    priceEuros: 395000,
    area: 'Sant Pere',
    bedrooms: 3,
    sizeM2: 90,
    latitude: 41.3855,
    longitude: 2.182,
    coverImage: null,
    agency: { name: 'Demo agency', verified: true },
  },
  {
    id: 22,
    title: 'New owner listing in Gràcia',
    operation: 'RENT',
    priceEuros: 1180,
    area: 'Gràcia',
    bedrooms: 2,
    sizeM2: 72,
    latitude: null,
    longitude: null,
    coverImage: null,
    agency: { name: 'Demo agency', verified: true },
  },
]

function renderMap() {
  render(
    <StrictMode>
      <MemoryRouter>
        <PropertyMap properties={properties} />
      </MemoryRouter>
    </StrictMode>,
  )
  return screen.getByRole('region', { name: 'Map of the properties in Barcelona' })
}

describe('PropertyMap', () => {
  it('has an accessible name', () => {
    expect(renderMap()).toBeInTheDocument()
  })

  it('shows one pin per property with coordinates, named by its title and price', () => {
    const map = renderMap()

    expect(
      within(map).getByRole('button', { name: 'Apartment in Gràcia, 950 €/month' }),
    ).toBeInTheDocument()
    expect(
      within(map).getByRole('button', { name: 'Apartment near Arc de Triomf, 395.000 €' }),
    ).toBeInTheDocument()
    expect(within(map).queryByRole('button', { name: /New owner listing/ })).not.toBeInTheDocument()
  })

  it('lets the keyboard reach every pin and open it with Enter', async () => {
    const map = renderMap()
    for (const pin of within(map).getAllByRole('button', { name: /€/ })) {
      expect(pin).toHaveAttribute('tabindex', '0')
    }

    // Leaflet opens a marker's popup on keypress with Enter
    const pin = within(map).getByRole('button', { name: 'Apartment in Gràcia, 950 €/month' })
    fireEvent.keyPress(pin, { key: 'Enter', code: 'Enter', keyCode: 13, charCode: 13 })

    expect(await within(map).findByRole('link', { name: /^See the details/ })).toHaveAttribute(
      'href',
      '/properties/7',
    )
  })

  it('shows the title, the price and a link to the details when a pin is selected', async () => {
    const map = renderMap()

    fireEvent.click(
      within(map).getByRole('button', { name: 'Apartment near Arc de Triomf, 395.000 €' }),
    )

    // The link names its property, because the focus lands on it without the title being read
    const link = await within(map).findByRole('link', {
      name: 'See the details: Apartment near Arc de Triomf',
    })
    expect(link).toHaveAttribute('href', '/properties/11')
    // The popup comes after every pin, so the focus moves to its link
    expect(link).toHaveFocus()
    expect(within(map).getByText('Apartment near Arc de Triomf')).toBeInTheDocument()
    expect(within(map).getByText('395.000 €')).toBeInTheDocument()
  })

  it('closes the popup with Escape and gives the focus back to its pin', async () => {
    const map = renderMap()
    const pin = within(map).getByRole('button', { name: 'Apartment in Gràcia, 950 €/month' })
    fireEvent.click(pin)
    const link = await within(map).findByRole('link', { name: /^See the details/ })

    fireEvent.keyDown(link, { key: 'Escape' })

    expect(within(map).queryByRole('link', { name: /^See the details/ })).not.toBeInTheDocument()
    expect(pin).toHaveFocus()
  })

  it("gives the focus back to the pin when the popup's close button is used", async () => {
    const map = renderMap()
    const pin = within(map).getByRole('button', { name: 'Apartment in Gràcia, 950 €/month' })
    fireEvent.click(pin)
    await within(map).findByRole('link', { name: /^See the details/ })
    const close = within(map).getByRole('button', { name: 'Close popup' })
    close.focus()

    fireEvent.click(close)

    expect(within(map).queryByRole('link', { name: /^See the details/ })).not.toBeInTheDocument()
    expect(pin).toHaveFocus()
  })

  it('opens a pin with Space too, as any button', async () => {
    const map = renderMap()
    const pin = within(map).getByRole('button', { name: 'Apartment near Arc de Triomf, 395.000 €' })

    fireEvent.keyDown(pin, { key: ' ' })

    expect(await within(map).findByRole('link', { name: /^See the details/ })).toHaveAttribute(
      'href',
      '/properties/11',
    )
  })

  it('keeps the OpenStreetMap attribution visible, as its license requires', () => {
    const map = renderMap()

    expect(within(map).getByRole('link', { name: 'OpenStreetMap' })).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/copyright',
    )
  })
})
