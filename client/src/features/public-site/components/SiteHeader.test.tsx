import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import SiteHeader from './SiteHeader'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SiteHeader />
    </MemoryRouter>,
  )
}

describe('SiteHeader', () => {
  it('links to the home page, the catalog, the four steps and the agency sign-in', () => {
    renderAt('/')

    expect(screen.getByRole('link', { name: 'Peephole, home page' })).toHaveAttribute('href', '/')
    const nav = within(screen.getByRole('navigation', { name: 'Main' }))
    expect(
      nav.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['Properties', '/properties'],
      ['How it works', '/#how-it-works'],
      ['Agency sign in', '/agency/sign-in'],
    ])
  })

  it('marks the page the visitor is on', () => {
    renderAt('/properties')

    expect(screen.getByRole('link', { name: 'Properties' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Agency sign in' })).not.toHaveAttribute('aria-current')
  })

  it('marks no page on the home page', () => {
    renderAt('/')

    expect(screen.queryByRole('link', { current: 'page' })).not.toBeInTheDocument()
  })
})
