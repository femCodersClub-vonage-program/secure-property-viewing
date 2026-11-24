import { render, screen } from '@testing-library/react'
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
