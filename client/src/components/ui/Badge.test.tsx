import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Badge from './Badge'

describe('Badge', () => {
  it('renders with pending variant', () => {
    render(<Badge variant="pending">Pending</Badge>)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders with approved variant', () => {
    render(<Badge variant="approved">Approved</Badge>)
    expect(screen.getByText('Approved')).toBeInTheDocument()
  })

  it('renders with rejected variant', () => {
    render(<Badge variant="rejected">Rejected</Badge>)
    expect(screen.getByText('Rejected')).toBeInTheDocument()
  })
})
