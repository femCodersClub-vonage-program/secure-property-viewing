import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PropertyDetailsPage from './PropertyDetailsPage'
import { SYSTEM_ERROR_MESSAGE } from '../lib/http'

// Shaped as in specs/property-browsing.md, "API"
const propertyFromSpec = {
  id: 7,
  title: 'Apartment in Gràcia',
  operation: 'RENT',
  propertyType: 'APARTMENT',
  priceEuros: 950,
  area: 'Gràcia',
  bedrooms: 2,
  sizeM2: 70,
  floor: 2,
  description: 'A charming apartment.',
  videoVisitAvailable: true,
  coverImage: { url: '/photo.jpg', altText: 'Living room' },
  agency: { name: 'Demo Agency', verified: true },
  images: [
    { url: '/photo-1.jpg', altText: 'Bright living room with a balcony' },
    { url: '/photo-2.jpg', altText: 'Fully fitted kitchen' },
  ],
}

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

function renderDetails(id: string | number = 7) {
  return render(
    <MemoryRouter initialEntries={[`/properties/${id}`]}>
      <Routes>
        <Route path="/properties/:id" element={<PropertyDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PropertyDetailsPage', () => {
  it('shows the property title as a heading', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertyFromSpec)))
    renderDetails()
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Apartment in Gràcia' })).toBeInTheDocument(),
    )
  })

  it('shows a loading state while fetching', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderDetails()
    expect(screen.getByText('Loading property…')).toBeInTheDocument()
  })

  it('shows the formatted price', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertyFromSpec)))
    renderDetails()
    await waitFor(() => expect(screen.getByText('950 €/month')).toBeInTheDocument())
  })

  it('shows the neighborhood', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertyFromSpec)))
    renderDetails()
    await waitFor(() => expect(screen.getByText('Gràcia')).toBeInTheDocument())
  })

  it('shows the number of bedrooms', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertyFromSpec)))
    renderDetails()
    await waitFor(() => expect(screen.getByText('2 bedrooms')).toBeInTheDocument())
  })

  it('shows the size', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertyFromSpec)))
    renderDetails()
    await waitFor(() => expect(screen.getByText('70 m²')).toBeInTheDocument())
  })

  it('shows the floor', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertyFromSpec)))
    renderDetails()
    await waitFor(() => expect(screen.getByText('Floor 2')).toBeInTheDocument())
  })

  it('shows the verified agency badge', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertyFromSpec)))
    renderDetails()
    await waitFor(() => expect(screen.getByText('Verified agency')).toBeInTheDocument())
  })

  it('shows the first photo with its alt text', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertyFromSpec)))
    renderDetails()
    await waitFor(() =>
      expect(
        screen.getByRole('img', { name: 'Bright living room with a balcony' }),
      ).toBeInTheDocument(),
    )
  })

  it('shows the Request a video visit link when video visit is available', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertyFromSpec)))
    renderDetails()
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /request a video visit/i })).toHaveAttribute(
        'href',
        '/properties/7/visit',
      ),
    )
  })

  it('does not show Request a video visit when unavailable', async () => {
    fetchMock.mockReturnValue(
      Promise.resolve(json({ ...propertyFromSpec, videoVisitAvailable: false })),
    )
    renderDetails()
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Apartment in Gràcia' })).toBeInTheDocument(),
    )
    expect(screen.queryByRole('link', { name: /request a video visit/i })).not.toBeInTheDocument()
  })

  it('shows a back to catalog link', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertyFromSpec)))
    renderDetails()
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /back to catalog/i })).toHaveAttribute(
        'href',
        '/properties',
      ),
    )
  })

  it('shows the not found page for a 404 response', async () => {
    fetchMock.mockReturnValue(Promise.resolve(problem(404, 'NOT_FOUND', 'Property not found')))
    renderDetails()
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument(),
    )
  })

  it('shows an error state for a system error', async () => {
    fetchMock.mockReturnValue(Promise.resolve(problem(500, 'INTERNAL', 'Server error')))
    renderDetails()
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByText(SYSTEM_ERROR_MESSAGE)).toBeInTheDocument()
  })

  it('shows the description', async () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertyFromSpec)))
    renderDetails()
    await waitFor(() =>
      expect(screen.getByText('A charming apartment.')).toBeInTheDocument(),
    )
  })

  it('shows the not found page for a non-numeric id', () => {
    fetchMock.mockReturnValue(Promise.resolve(json(propertyFromSpec)))
    renderDetails('abc')
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })
})
