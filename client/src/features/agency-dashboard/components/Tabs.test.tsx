import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Tabs from './Tabs'

const tabs = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
]

function renderTabs(onSelect = vi.fn()) {
  render(
    <Tabs label="Request status" tabs={tabs} selectedId="PENDING" onSelect={onSelect}>
      <p>Pending list</p>
    </Tabs>,
  )
  return onSelect
}

describe('Tabs', () => {
  it('marks the selected tab and names the panel after it', () => {
    renderTabs()

    expect(screen.getByRole('tablist', { name: 'Request status' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Pending' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Approved' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tabpanel', { name: 'Pending' })).toHaveTextContent('Pending list')
  })

  it('selects a tab on click', () => {
    const onSelect = renderTabs()

    fireEvent.click(screen.getByRole('tab', { name: 'Rejected' }))

    expect(onSelect).toHaveBeenCalledWith('REJECTED')
  })

  it('moves with the arrow keys and wraps around', () => {
    const onSelect = renderTabs()
    const pending = screen.getByRole('tab', { name: 'Pending' })

    fireEvent.keyDown(pending, { key: 'ArrowLeft' })

    expect(onSelect).toHaveBeenCalledWith('REJECTED')
    expect(screen.getByRole('tab', { name: 'Rejected' })).toHaveFocus()
  })

  it('keeps only the selected tab in the Tab order', () => {
    renderTabs()

    expect(screen.getByRole('tab', { name: 'Pending' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Approved' })).toHaveAttribute('tabindex', '-1')
  })
})
