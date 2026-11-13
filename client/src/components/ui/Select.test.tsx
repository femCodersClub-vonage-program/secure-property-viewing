import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Select from './Select'

describe('Select', () => {
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
