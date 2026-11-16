import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Alert, Button, FormField, Input } from '../../../components/ui'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import { checkPhoneVerificationCode, startPhoneVerification } from '../api'
import type { PhoneVerificationPurpose, VerifiedPhone } from '../types'

type Props = {
  purpose: PhoneVerificationPurpose
  onVerified: (result: VerifiedPhone) => void
}

type Step =
  | { name: 'phone' }
  | {
      name: 'code'
      verificationId: number
      phone: string
      resendAvailableAt: number
      resent: boolean
    }

// Where the focus goes after the screen changes, so it never falls back to the page body
type FocusTarget = 'phone' | 'code' | 'ended'

const USE_OF_THE_NUMBER: Record<PhoneVerificationPurpose, string> = {
  VISIT: 'We use this number to confirm your visit and to send you its messages.',
  LISTING_REQUEST:
    'We use this number to confirm your listing request and to send you its updates.',
}

// These errors end the verification: the person has to ask for a new code
const ENDED_CODES = new Set([
  'VERIFICATION_EXPIRED',
  'VERIFICATION_TOO_MANY_ATTEMPTS',
  'VERIFICATION_NOT_FOUND',
])

const CODE_LENGTH = 6

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : SYSTEM_ERROR_MESSAGE
}

// People type numbers with spaces, dashes or brackets: the server expects only + and digits
function normalizePhone(value: string): string {
  return value.replace(/[\s\-().]/g, '')
}

function secondsUntil(timestamp: number, now: number): number {
  return Math.max(0, Math.ceil((timestamp - now) / 1000))
}

function PhoneVerification({ purpose, onVerified }: Props) {
  const [step, setStep] = useState<Step>({ name: 'phone' })
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const [alert, setAlert] = useState<string>()
  const [ended, setEnded] = useState(false)
  const [sending, setSending] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [focusTarget, setFocusTarget] = useState<FocusTarget>()

  const phoneInput = useRef<HTMLInputElement>(null)
  const codeInput = useRef<HTMLInputElement>(null)
  const endedMessage = useRef<HTMLDivElement>(null)

  const secondsLeft = step.name === 'code' ? secondsUntil(step.resendAvailableAt, now) : 0

  // A ticking clock is a subscription to time, so it belongs in an effect
  useEffect(() => {
    if (secondsLeft === 0) {
      return undefined
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [secondsLeft])

  // Moving the focus is a change to the DOM after it renders, so it also belongs in an effect
  useEffect(() => {
    if (focusTarget === 'phone') phoneInput.current?.focus()
    if (focusTarget === 'code') codeInput.current?.focus()
    if (focusTarget === 'ended') endedMessage.current?.focus()
  }, [focusTarget, step, ended])

  async function sendCode(phoneNumber: string) {
    setSending(true)
    setFieldError(undefined)
    setAlert(undefined)
    try {
      const started = await startPhoneVerification(phoneNumber, purpose)
      setStep({
        name: 'code',
        verificationId: started.id,
        phone: phoneNumber,
        resendAvailableAt: Date.parse(started.resendAvailableAt),
        resent: step.name === 'code',
      })
      setNow(Date.now())
      setCode('')
      setEnded(false)
      setFocusTarget('code')
    } catch (error) {
      const phoneError = error instanceof ApiError ? error.fieldErrors.phone : undefined
      if (phoneError && step.name === 'phone') {
        setFieldError(phoneError)
      } else {
        setAlert(errorMessage(error))
      }
    } finally {
      setSending(false)
    }
  }

  async function checkCode(verificationId: number, verifiedPhone: string) {
    setSending(true)
    setFieldError(undefined)
    setAlert(undefined)
    try {
      const checked = await checkPhoneVerificationCode(verificationId, code)
      onVerified({ verificationId: checked.id, phone: verifiedPhone })
    } catch (error) {
      const errorCode = error instanceof ApiError ? error.code : undefined
      if (errorCode && ENDED_CODES.has(errorCode)) {
        setEnded(true)
        setAlert(errorMessage(error))
        setFocusTarget('ended')
      } else {
        setFieldError(errorMessage(error))
      }
    } finally {
      setSending(false)
    }
  }

  function handlePhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const phoneNumber = normalizePhone(phone)
    if (phoneNumber === '') {
      setFieldError('Enter your phone number in international format, such as +34 600 000 000.')
      return
    }
    void sendCode(phoneNumber)
  }

  function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step.name !== 'code') {
      return
    }
    if (code.length !== CODE_LENGTH) {
      setFieldError('Enter the 6 digits from the SMS.')
      return
    }
    void checkCode(step.verificationId, step.phone)
  }

  function changeNumber() {
    setStep({ name: 'phone' })
    setFieldError(undefined)
    setAlert(undefined)
    setEnded(false)
    setFocusTarget('phone')
  }

  const statusText =
    step.name === 'code'
      ? `We've sent ${step.resent ? 'a new' : 'a'} 6-digit code by SMS to ${step.phone}.`
      : ''

  return (
    <section className="flex flex-col gap-4" aria-labelledby="phone-verification-title">
      <h2
        id="phone-verification-title"
        className="font-display text-2xl font-bold text-balance text-brand-dark"
      >
        Verify your phone number
      </h2>
      {/* Mounted in both steps, so a change of text is announced */}
      <p className="font-body text-text-default" role="status">
        {statusText}
      </p>

      {step.name === 'phone' ? (
        <form onSubmit={handlePhoneSubmit} noValidate className="flex flex-col gap-4">
          <FormField
            id="verification-phone"
            label="Phone number"
            hint={`In international format, such as +34 600 000 000. ${USE_OF_THE_NUMBER[purpose]}`}
            error={fieldError}
          >
            {(props) => (
              <Input
                {...props}
                ref={phoneInput}
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            )}
          </FormField>
          {alert ? <Alert variant="error">{alert}</Alert> : null}
          <Button type="submit" loading={sending}>
            Send code
          </Button>
        </form>
      ) : (
        <form onSubmit={handleCodeSubmit} noValidate className="flex flex-col gap-4">
          {ended ? null : (
            <FormField
              id="verification-code"
              label="Code from the SMS"
              hint="Enter the 6 digits we sent you."
              error={fieldError}
            >
              {(props) => (
                <Input
                  {...props}
                  ref={codeInput}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  // Keeps the first 6 digits, so a pasted "482 931" still works
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))
                  }
                  className="text-center"
                />
              )}
            </FormField>
          )}
          {alert ? (
            <div ref={endedMessage} tabIndex={-1}>
              <Alert variant="error">{alert}</Alert>
            </div>
          ) : null}
          {ended ? null : (
            <Button type="submit" loading={sending}>
              Verify
            </Button>
          )}
          {secondsLeft > 0 ? (
            <p className="font-body text-text-muted">
              You can ask for a new code in {secondsLeft} s.
            </p>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            disabled={secondsLeft > 0 || sending}
            onClick={() => void sendCode(step.phone)}
          >
            Send a new code
          </Button>
          <Button type="button" variant="secondary" onClick={changeNumber}>
            Change the number
          </Button>
        </form>
      )}
    </section>
  )
}

export default PhoneVerification
