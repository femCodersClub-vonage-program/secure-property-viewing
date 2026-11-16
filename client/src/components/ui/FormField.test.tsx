import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FormField from './FormField'

describe('FormField', () => {
  it('renders a label linked to the input id', () => {
    render(
      <FormField id="email" label="Email address">
        {(props) => <input {...props} type="email" />}
      </FormField>,
    )
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
  })

  it('links the hint to the input via aria-describedby', () => {
    render(
      <FormField id="email" label="Email address" hint="We will never share your email">
        {(props) => <input {...props} type="email" />}
      </FormField>,
    )
    const input = screen.getByLabelText('Email address')
    expect(input.getAttribute('aria-describedby')).toContain('email-hint')
    expect(screen.getByText('We will never share your email')).toBeInTheDocument()
  })

  it('links the error to the input via aria-describedby and sets aria-invalid', () => {
    render(
      <FormField id="email" label="Email address" error="Enter a valid email">
        {(props) => <input {...props} type="email" />}
      </FormField>,
    )
    const input = screen.getByLabelText('Email address')
    expect(input.getAttribute('aria-describedby')).toContain('email-error')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email')
  })

  it('links both hint and error when both are present', () => {
    render(
      <FormField id="email" label="Email address" hint="Hint text" error="Error text">
        {(props) => <input {...props} type="email" />}
      </FormField>,
    )
    const describedBy = screen.getByLabelText('Email address').getAttribute('aria-describedby')
    expect(describedBy).toContain('email-hint')
    expect(describedBy).toContain('email-error')
  })
})
