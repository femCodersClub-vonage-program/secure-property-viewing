import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SYSTEM_ERROR_MESSAGE } from '../lib/http'
import HomePage from './HomePage'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset().mockImplementation(() => new Promise(() => {}))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const property = (id: number, operation: 'RENT' | 'SALE') => ({
  id,
  title: `Property ${id}`,
  operation,
  priceEuros: 1250,
  area: 'Gràcia',
  bedrooms: 2,
  sizeM2: 78,
  latitude: 41.4036,
  longitude: 2.1566,
  coverImage: { url: `/properties/${id}.webp`, altText: `Photo of property ${id}` },
  agency: { name: 'Test Agency', verified: true },
})

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

const STEPS_HEADING = 'Four steps, and the scam each one stops'

describe('HomePage', () => {
  it('shows the main headline', () => {
    renderHome()
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Find your next home in Barcelona, without scams.',
      }),
    ).toBeInTheDocument()
  })

  it('links to the catalog', () => {
    renderHome()
    expect(screen.getByRole('link', { name: 'Browse properties' })).toHaveAttribute(
      'href',
      '/properties',
    )
  })

  it('links to the owner listing from the hero and the section for owners', () => {
    renderHome()
    const links = screen.getAllByRole('link', { name: 'List my property' })
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/list-property',
      '/list-property',
    ])
  })

  it('shows the three trust point headings', () => {
    renderHome()
    expect(screen.getByRole('heading', { name: 'Verified agencies' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Video visits' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Secure communication' })).toBeInTheDocument()
  })

  it('gives the four steps the id that "How it works" leads to', () => {
    renderHome()
    expect(screen.getByRole('region', { name: STEPS_HEADING })).toHaveAttribute(
      'id',
      'how-it-works',
    )
  })

  it('explains the visit in four ordered steps, each with the scam it stops', () => {
    renderHome()
    const steps = within(screen.getByRole('region', { name: STEPS_HEADING }))

    expect(
      steps.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent),
    ).toEqual(['Choose a property', 'Verify your phone', 'Visit it live', 'Answer one call'])
    expect(steps.getAllByText(/^Stops /)).toHaveLength(4)
  })
})

describe('HomePage properties', () => {
  it('says it is loading them', () => {
    renderHome()
    expect(screen.getByRole('status')).toHaveTextContent('Loading properties…')
  })

  it('shows two rentals and two sales, with links to the catalog', async () => {
    fetchMock.mockResolvedValue(
      json([
        property(1, 'RENT'),
        property(2, 'RENT'),
        property(3, 'RENT'),
        property(4, 'SALE'),
        property(5, 'SALE'),
      ]),
    )
    renderHome()

    const list = within(await screen.findByRole('list', { name: 'Featured properties' }))
    expect(
      list.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent),
    ).toEqual(['Property 1', 'Property 2', 'Property 4', 'Property 5'])
    expect(list.getByRole('link', { name: 'See the details: Property 4' })).toHaveAttribute(
      'href',
      '/properties/4',
    )

    const catalog = within(screen.getByRole('list', { name: 'Browse the catalog' }))
    expect(
      catalog.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['For rent', '/properties?operation=RENT'],
      ['For sale', '/properties?operation=SALE'],
      ['See all on the map', '/properties'],
    ])
  })

  it('says so when there are none', async () => {
    fetchMock.mockResolvedValue(json([]))
    renderHome()
    expect(await screen.findByText('No properties to show right now.')).toBeInTheDocument()
  })

  it('keeps the rest of the page when they fail to load, and tries again', async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 500))
      .mockResolvedValueOnce(json([property(1, 'RENT')]))
    renderHome()

    expect(await screen.findByRole('alert')).toHaveTextContent(SYSTEM_ERROR_MESSAGE)
    expect(screen.getByRole('heading', { name: 'Why Peephole?' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Property 1' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
