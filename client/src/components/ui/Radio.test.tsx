import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Radio from './Radio'

describe('Radio', () => {
  it('renders with an accessible label', () => {
    render(
      <label>
        <Radio name="plan" value="basic" />
        Basic plan
      </label>,
    )
    expect(screen.getByRole('radio', { name: 'Basic plan' })).toBeInTheDocument()
  })
})
