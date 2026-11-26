import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CatalogPage from './CatalogPage'
import { SYSTEM_ERROR_MESSAGE } from '../lib/http'

vi.mock('../features/property-browsing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/property-browsing')>()
  return {
    ...actual,
    PropertyMap: ({ properties }: { properties: unknown[] }) => (
      <div role="region" aria-label="Property map">
        {properties.length} pins
      </div>
    ),
  }
})

// Shaped as in specs/property-browsing.md, "API"
const propertiesFromSpec = [
  {
    id: 1,
    title: 'Apartment in Gràcia',
    operation: 'RENT',
    priceEuros: 950,
    area: 'Gràcia',
    bedrooms: 2,
    sizeM2: 70,
    latitude: 41.4036,
    longitude: 2.1566,
    coverImage: { url: '/photo.jpg', altText: 'Living room' },
    agency: { name: 'Demo Agency', verified: true },
  },
  {
    id: 2,
    title: 'House in Sarrià',
    operation: 'SALE',
    priceEuros: 820000,
    area: 'Sarrià',
    bedrooms: 4,
    sizeM2: 180,
    latitude: 41.4015,
    longitude: 2.1211,
    coverImage: null,
    agency: { name: 'Demo Agency', verified: true },
  },
]

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

const problem = (status: number, code: string, detail: string) =>
  new Response(JSON.stringify({ title: 'Error', status, detail, code }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function LocationDisplay() {
  return <output data-testid="location">{useLocation().search}</output>
}

function renderCatalog(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/properties${search}`]}>
      <Routes>
        <Route path="/properties" element={<CatalogPage />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  )
}

describe('CatalogPage', () => {
  it('shows the page heading', () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertiesFromSpec)))
    renderCatalog()
    expect(screen.getByRole('heading', { name: 'Properties in Barcelona' })).toBeInTheDocument()
  })

  it('shows All, Rent and Sale filter buttons', () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertiesFromSpec)))
    renderCatalog()
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rent' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sale' })).toBeInTheDocument()
  })

  it('shows All as the active filter by default', () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertiesFromSpec)))
    renderCatalog()
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('says how many properties there are', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertiesFromSpec)))
    renderCatalog()
    expect(await screen.findByText('2 properties found.')).toBeInTheDocument()
  })

  it('starts short again when the filter changes', async () => {
    const [property] = propertiesFromSpec
    const many = Array.from({ length: 12 }, (_, index) => ({ ...property, id: index + 1 }))
    fetchMock.mockImplementation(() => Promise.resolve(json(many)))
    renderCatalog()

    fireEvent.click(await screen.findByRole('button', { name: 'Show more' }))
    expect(screen.getAllByRole('link', { name: /see the details/i })).toHaveLength(12)

    fireEvent.click(screen.getByRole('button', { name: 'Rent' }))
    expect(await screen.findByText('Showing 8 of 12')).toBeInTheDocument()
  })

  it('puts every property on the map, not only the cards on screen', async () => {
    const [property] = propertiesFromSpec
    const many = Array.from({ length: 12 }, (_, index) => ({ ...property, id: index + 1 }))
    fetchMock.mockReturnValue(Promise.resolve(json(many)))
    renderCatalog()

    expect(await screen.findByText('12 pins')).toBeInTheDocument()
  })

  it('shows a loading state while fetching', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderCatalog()
    expect(screen.getByText('Loading properties…')).toBeInTheDocument()
  })

  it('lists properties returned by the API', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertiesFromSpec)))
    renderCatalog()
    await waitFor(() =>
      expect(screen.getAllByRole('link', { name: /see the details/i })).toHaveLength(
        propertiesFromSpec.length,
      ),
    )
  })

  it('calls GET /api/properties with the operation filter in the URL', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json([propertiesFromSpec[0]])))
    renderCatalog('?operation=RENT')
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/properties?operation=RENT', expect.anything()),
    )
  })

  it('shows Rent as the active filter when the URL has operation=RENT', () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertiesFromSpec)))
    renderCatalog('?operation=RENT')
    expect(screen.getByRole('button', { name: 'Rent' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows an empty state when the API returns no properties', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json([])))
    renderCatalog()
    await waitFor(() =>
      expect(screen.getByText('No properties match the current filter.')).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'Clear filter' })).toBeInTheDocument()
  })

  it('shows an error state when the API fails', async () => {
    fetchMock.mockReturnValue(Promise.resolve(problem(500, 'INTERNAL', 'Internal error')))
    renderCatalog()
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByText(SYSTEM_ERROR_MESSAGE)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('links each card to the property details page', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertiesFromSpec)))
    renderCatalog()
    const firstProperty = propertiesFromSpec[0]
    expect(firstProperty).toBeDefined()
    await waitFor(() => {
      const links = screen.getAllByRole('link', { name: /see the details/i })
      expect(links[0]).toHaveAttribute('href', `/properties/${firstProperty?.id}`)
    })
  })

  it('updates the URL when a filter button is clicked', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertiesFromSpec)))
    renderCatalog()
    fireEvent.click(screen.getByRole('button', { name: 'Rent' }))
    expect(screen.getByTestId('location').textContent).toBe('?operation=RENT')
  })

  it('clears the URL filter when All is clicked', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertiesFromSpec)))
    renderCatalog('?operation=RENT')
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByTestId('location').textContent).toBe('')
  })

  it('fetches again with new filter when a filter button is clicked', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertiesFromSpec)))
    renderCatalog()
    await waitFor(() => screen.getAllByRole('link', { name: /see the details/i }))
    fetchMock.mockReturnValue(Promise.resolve(json([propertiesFromSpec[0]])))
    fireEvent.click(screen.getByRole('button', { name: 'Rent' }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/properties?operation=RENT', expect.anything()),
    )
  })

  it('shows the property map when properties load', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertiesFromSpec)))
    renderCatalog()
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Property map' })).toBeInTheDocument(),
    )
  })

  it('does not show the map while loading', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderCatalog()
    expect(screen.queryByRole('region', { name: 'Property map' })).not.toBeInTheDocument()
  })

  it('does not show the map when the API returns no properties', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json([])))
    renderCatalog()
    await waitFor(() => screen.getByText('No properties match the current filter.'))
    expect(screen.queryByRole('region', { name: 'Property map' })).not.toBeInTheDocument()
  })
})
