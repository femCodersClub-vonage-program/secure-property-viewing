import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FormField from './FormField'
import Input from './Input'

describe('Input', () => {
  it('renders a text field with the accessible name of its FormField', () => {
    render(
      <FormField id="phone" label="Phone number" hint="In international format">
        {(props) => <Input {...props} />}
      </FormField>,
    )

    const field = screen.getByRole('textbox', { name: 'Phone number' })
    expect(field).toHaveAccessibleDescription('In international format')
  })

  it('shows a field with an error with the error border, not only through its message', () => {
    render(
      <FormField id="code" label="Code" error="The code does not match.">
        {(props) => <Input {...props} />}
      </FormField>,
    )

    const field = screen.getByRole('textbox', { name: 'Code' })
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveClass('border-error')
  })

  it('keeps the input border while the field has no error', () => {
    render(<Input aria-label="Code" />)
    expect(screen.getByRole('textbox', { name: 'Code' })).toHaveClass('border-border-input')
  })

  it('keeps the type it is given', () => {
    render(<Input aria-label="Phone number" type="tel" />)
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveAttribute('type', 'tel')
  })
})
