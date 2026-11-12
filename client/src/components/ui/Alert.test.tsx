import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Alert from './Alert'

describe('Alert', () => {
  it('renders with role alert', () => {
    render(<Alert variant="info">Something happened</Alert>)
    expect(screen.getByRole('alert')).toHaveTextContent('Something happened')
  })

  it('renders error variant', () => {
    render(<Alert variant="error">Could not save</Alert>)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save')
  })

  it('renders success variant', () => {
    render(<Alert variant="success">Saved successfully</Alert>)
    expect(screen.getByRole('alert')).toHaveTextContent('Saved successfully')
  })

  it('renders warning variant', () => {
    render(<Alert variant="warning">Check your connection</Alert>)
    expect(screen.getByRole('alert')).toHaveTextContent('Check your connection')
  })
})
