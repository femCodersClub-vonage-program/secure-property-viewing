import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import VerificationBadge from './VerificationBadge'

describe('VerificationBadge', () => {
  it('shows verified agency label when verified', () => {
    render(<VerificationBadge verified={true} />)
    expect(screen.getByText('Verified agency')).toBeInTheDocument()
  })

  it('shows unverified agency label when not verified', () => {
    render(<VerificationBadge verified={false} />)
    expect(screen.getByText('Unverified agency')).toBeInTheDocument()
  })
})
