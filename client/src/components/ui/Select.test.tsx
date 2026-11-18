import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FormField from './FormField'
import Select from './Select'

describe('Select', () => {
  it('shows a field with an error with the same error border as Input', () => {
    render(
      <FormField id="country" label="Country" error="Choose a country.">
        {(props) => (
          <Select {...props}>
            <option value="es">Spain</option>
          </Select>
        )}
      </FormField>,
    )

    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveClass('border-error')
  })

  it('renders with an accessible label and its options', () => {
    render(
      <label htmlFor="country">
        Country
        <Select id="country">
          <option value="gb">United Kingdom</option>
          <option value="es">Spain</option>
        </Select>
      </label>,
    )
    expect(screen.getByRole('combobox', { name: 'Country' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'United Kingdom' })).toBeInTheDocument()
  })
})
