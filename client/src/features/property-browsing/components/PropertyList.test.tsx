import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { PropertySummary } from '../types'
import PropertyList from './PropertyList'

function propertiesOf(count: number): PropertySummary[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    title: `Property ${index + 1}`,
    operation: 'RENT',
    priceEuros: 950,
    area: 'Gràcia',
    bedrooms: 2,
    sizeM2: 70,
    coverImage: null,
    agency: { name: 'Test Agency', verified: true },
  }))
}

function renderList(count: number) {
  render(
    <MemoryRouter>
      <PropertyList properties={propertiesOf(count)} />
    </MemoryRouter>,
  )
}

const cards = () => screen.getAllByRole('link', { name: /^See the details/ })
const showMore = () => screen.queryByRole('button', { name: 'Show more' })

function clickShowMore() {
  fireEvent.click(screen.getByRole('button', { name: 'Show more' }))
}

describe('PropertyList', () => {
  it('shows every property, with nothing else, when there are at most 8', () => {
    renderList(8)

    expect(cards()).toHaveLength(8)
    expect(showMore()).not.toBeInTheDocument()
    expect(screen.queryByText(/^Showing/)).not.toBeInTheDocument()
  })

  it('shows 8 more each time until there are none left', () => {
    renderList(21)
    expect(cards()).toHaveLength(8)
    expect(screen.getByText('Showing 8 of 21')).toBeInTheDocument()

    clickShowMore()
    expect(cards()).toHaveLength(16)
    expect(screen.getByText('Showing 16 of 21')).toBeInTheDocument()

    clickShowMore()
    expect(cards()).toHaveLength(21)
    expect(screen.getByText('Showing 21 of 21')).toBeInTheDocument()
    expect(showMore()).not.toBeInTheDocument()
  })

  it('moves the focus to the first card it added, also when the button disappears', () => {
    renderList(17)

    clickShowMore()
    expect(document.activeElement).toContainElement(
      screen.getByRole('heading', { name: 'Property 9' }),
    )

    clickShowMore()
    expect(document.activeElement).toContainElement(
      screen.getByRole('heading', { name: 'Property 17' }),
    )
  })
})
