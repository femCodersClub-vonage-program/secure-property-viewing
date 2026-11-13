import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Textarea from './Textarea'

describe('Textarea', () => {
  it('renders with an accessible label when used inside FormField', () => {
    render(
      <label htmlFor="notes">
        Notes
        <Textarea id="notes" />
      </label>,
    )
    expect(screen.getByRole('textbox', { name: 'Notes' })).toBeInTheDocument()
  })
})
