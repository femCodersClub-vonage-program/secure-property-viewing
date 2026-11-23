import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import HomePage from './HomePage'

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  it('shows the main headline', () => {
    renderHome()
    expect(
      screen.getByRole('heading', {
        name: 'Find your next home in Catalonia, without scams.',
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

  it('links to the agency sign-up', () => {
    renderHome()
    expect(screen.getByRole('link', { name: 'List my property' })).toHaveAttribute(
      'href',
      '/agencies/sign-up',
    )
  })

  it('shows the three trust point headings', () => {
    renderHome()
    expect(screen.getByRole('heading', { name: 'Verified agencies' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Video visits' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Secure communication' })).toBeInTheDocument()
  })
})
