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

  it('keeps the type it is given', () => {
    render(<Input aria-label="Phone number" type="tel" />)
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveAttribute('type', 'tel')
  })
})
