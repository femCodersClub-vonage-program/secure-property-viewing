import { useRef, useState, type FormEvent } from 'react'
import { Alert, Button, Card, FormField, Input } from '../../../components/ui'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import { signIn } from '../api'
import type { AgencyUser } from '../types'
import PasswordInput from './PasswordInput'
import DashboardHeading from './DashboardHeading'

type FieldErrors = { email?: string; password?: string }

interface SignInFormProps {
  onSignedIn: (user: AgencyUser) => void
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : SYSTEM_ERROR_MESSAGE
}

// Checked before calling the server, so each message says what to fix
function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  if (email === '') errors.email = 'Enter your email address.'
  if (password === '') errors.password = 'Enter your password.'
  return errors
}

function SignInForm({ onSignedIn }: SignInFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [alert, setAlert] = useState<string>()
  const [sending, setSending] = useState(false)
  const emailInput = useRef<HTMLInputElement>(null)
  const passwordInput = useRef<HTMLInputElement>(null)

  async function send(trimmedEmail: string) {
    setSending(true)
    try {
      onSignedIn(await signIn(trimmedEmail, password))
    } catch (error) {
      // 401 INVALID_CREDENTIALS and system errors: the message is always safe to show
      setAlert(errorMessage(error))
      // The button was disabled while sending, so the focus goes back to the start of the form
      emailInput.current?.focus()
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAlert(undefined)
    const trimmedEmail = email.trim()
    const errors = validate(trimmedEmail, password)
    setFieldErrors(errors)
    if (errors.email) {
      emailInput.current?.focus()
      return
    }
    if (errors.password) {
      passwordInput.current?.focus()
      return
    }
    void send(trimmedEmail)
  }

  return (
    <Card className="flex flex-col gap-8 px-6 py-8 sm:px-10">
      <header className="flex flex-col gap-2 text-center">
        <DashboardHeading>Sign in</DashboardHeading>
        <p className="text-text-muted">Agency staff only.</p>
      </header>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <FormField id="sign-in-email" label="Email" error={fieldErrors.email}>
          {(props) => (
            <Input
              {...props}
              ref={emailInput}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          )}
        </FormField>
        <FormField id="sign-in-password" label="Password" error={fieldErrors.password}>
          {(props) => (
            <PasswordInput
              {...props}
              ref={passwordInput}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </FormField>
        {alert ? <Alert variant="error">{alert}</Alert> : null}
        <Button type="submit" loading={sending} className="min-h-12">
          Sign in
        </Button>
      </form>
    </Card>
  )
}

export default SignInForm
