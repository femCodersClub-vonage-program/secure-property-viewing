import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Card from './Card'

describe('Card', () => {
  it('renders its children', () => {
    render(<Card>Property listing</Card>)
    expect(screen.getByText('Property listing')).toBeInTheDocument()
  })

  it('uses the page surface with a border by default', () => {
    render(<Card>Property listing</Card>)
    expect(screen.getByText('Property listing')).toHaveClass('bg-surface-card', 'border-border')
  })

  it('has a dark variant with white text and no border', () => {
    render(<Card variant="dark">Your visit</Card>)
    const card = screen.getByText('Your visit')
    expect(card).toHaveClass('bg-brand-dark', 'text-text-light')
    expect(card).not.toHaveClass('border')
  })
})
