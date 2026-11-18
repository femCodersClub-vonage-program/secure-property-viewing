import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FormField from './FormField'
import Textarea from './Textarea'

describe('Textarea', () => {
  it('shows a field with an error with the same error border as Input', () => {
    render(
      <FormField id="notes" label="Notes" error="Write a few words.">
        {(props) => <Textarea {...props} />}
      </FormField>,
    )

    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveClass('border-error')
  })

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
