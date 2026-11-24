import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PasswordInput from './PasswordInput'

// A label like the one FormField gives it, so the field is found by its name
function renderInForm(onSubmit = vi.fn()) {
  render(
    <form onSubmit={onSubmit}>
      <label htmlFor="password">Password</label>
      <PasswordInput id="password" />
    </form>,
  )
}

describe('PasswordInput', () => {
  it('hides the password at first', () => {
    renderInForm()

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('shows the password and hides it again', () => {
    renderInForm()
    const toggle = screen.getByRole('button', { name: 'Show password' })

    fireEvent.click(toggle)
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(toggle)
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('never submits the form', () => {
    const onSubmit = vi.fn()
    renderInForm(onSubmit)

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })
})
