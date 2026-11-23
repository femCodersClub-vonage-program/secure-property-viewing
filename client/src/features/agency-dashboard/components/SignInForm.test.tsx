import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import { signIn } from '../api'
import SignInForm from './SignInForm'

// The form is tested on its own: the calls to the server are covered in api.test.ts
vi.mock('../api', () => ({ signIn: vi.fn() }))

// The detail the server sends, from InvalidCredentialsException in server/.../agency/
const INVALID_CREDENTIALS = 'The email or password is incorrect. Check them and try again.'
const user = { name: 'Marta', role: 'AGENT' } as const

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('SignInForm', () => {
  afterEach(() => {
    vi.mocked(signIn).mockReset()
  })

  it('has a heading, a labelled email and password, and a Sign in button', () => {
    render(<SignInForm onSignedIn={vi.fn()} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  it('asks for both fields before calling the server', () => {
    render(<SignInForm onSignedIn={vi.fn()} />)

    fillAndSubmit('  ', '')

    expect(screen.getByText('Enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('signs in with the email without spaces and hands over the user', async () => {
    vi.mocked(signIn).mockResolvedValueOnce(user)
    const onSignedIn = vi.fn()
    render(<SignInForm onSignedIn={onSignedIn} />)

    fillAndSubmit('  marta@example.com ', 'secret')

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith(user))
    expect(signIn).toHaveBeenCalledWith('marta@example.com', 'secret')
  })

  it('shows the button as busy while signing in', () => {
    // Never resolves, so the form stays in its sending state
    vi.mocked(signIn).mockReturnValueOnce(new Promise(() => {}))
    render(<SignInForm onSignedIn={vi.fn()} />)

    fillAndSubmit('marta@example.com', 'secret')

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('aria-busy', 'true')
  })

  it('shows the server message for wrong credentials and lets her try again', async () => {
    vi.mocked(signIn).mockRejectedValueOnce(
      new ApiError({
        kind: 'business',
        message: INVALID_CREDENTIALS,
        status: 401,
        code: 'INVALID_CREDENTIALS',
      }),
    )
    const onSignedIn = vi.fn()
    render(<SignInForm onSignedIn={onSignedIn} />)

    fillAndSubmit('marta@example.com', 'wrong')

    expect(await screen.findByRole('alert')).toHaveTextContent(INVALID_CREDENTIALS)
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveFocus()
    expect(onSignedIn).not.toHaveBeenCalled()
  })

  it('shows the generic message when the server fails', async () => {
    vi.mocked(signIn).mockRejectedValueOnce(
      new ApiError({ kind: 'system', message: SYSTEM_ERROR_MESSAGE, status: 500 }),
    )
    render(<SignInForm onSignedIn={vi.fn()} />)

    fillAndSubmit('marta@example.com', 'secret')

    expect(await screen.findByRole('alert')).toHaveTextContent(SYSTEM_ERROR_MESSAGE)
  })
})
