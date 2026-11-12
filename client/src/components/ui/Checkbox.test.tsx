import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Checkbox from './Checkbox'

describe('Checkbox', () => {
  it('renders with an accessible label', () => {
    render(
      <label>
        <Checkbox />
        Agree to terms
      </label>,
    )
    expect(screen.getByRole('checkbox', { name: 'Agree to terms' })).toBeInTheDocument()
  })
})
