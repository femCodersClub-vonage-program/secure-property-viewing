import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import SideNav from './SideNav'

function renderAt(path: string, onSignOut = vi.fn()) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SideNav onSignOut={onSignOut} />
    </MemoryRouter>,
  )
  return onSignOut
}

describe('SideNav', () => {
  it('lists every agency page with a text label', () => {
    renderAt('/agency')

    const nav = screen.getByRole('navigation', { name: 'Agency' })
    expect(nav).toBeInTheDocument()
    for (const name of [
      'Dashboard',
      'Properties',
      'Listing requests',
      'Calendar',
      'Messages',
      'Profile',
    ]) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it('marks only the current page with aria-current', () => {
    renderAt('/agency/calendar')

    expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('signs out from a button', () => {
    const onSignOut = renderAt('/agency')

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(onSignOut).toHaveBeenCalledOnce()
  })
})
