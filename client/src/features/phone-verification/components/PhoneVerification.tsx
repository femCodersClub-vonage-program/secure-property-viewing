import { useEffect, useState, type FormEvent } from 'react'
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
  | { name: 'code'; verificationId: number; phone: string; resendAvailableAt: number }

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

  const secondsLeft = step.name === 'code' ? secondsUntil(step.resendAvailableAt, now) : 0

  // A ticking clock is a subscription to time, so it belongs in an effect
  useEffect(() => {
    if (secondsLeft === 0) {
      return undefined
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [secondsLeft])

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
      })
      setNow(Date.now())
      setCode('')
      setEnded(false)
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
      } else {
        setFieldError(errorMessage(error))
      }
    } finally {
      setSending(false)
    }
  }

  function handlePhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendCode(normalizePhone(phone))
  }

  function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step.name === 'code') {
      void checkCode(step.verificationId, step.phone)
    }
  }

  function changeNumber() {
    setStep({ name: 'phone' })
    setFieldError(undefined)
    setAlert(undefined)
    setEnded(false)
  }

  if (step.name === 'phone') {
    return (
      <form onSubmit={handlePhoneSubmit} noValidate className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-bold text-brand-dark">
          Verify your phone number
        </h2>
        <FormField
          id="verification-phone"
          label="Phone number"
          hint={`In international format, such as +34 600 000 000. ${USE_OF_THE_NUMBER[purpose]}`}
          error={fieldError}
        >
          {(props) => (
            <Input
              {...props}
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          )}
        </FormField>
        {alert ? <Alert variant="error">{alert}</Alert> : null}
        <Button type="submit" loading={sending} disabled={phone.trim() === ''}>
          Send code
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={handleCodeSubmit} noValidate className="flex flex-col gap-4">
      <h2 className="font-display text-2xl font-bold text-brand-dark">Verify your phone number</h2>
      <p className="font-body text-text-default" role="status">
        We've sent a 6-digit code by SMS to {step.phone}.
      </p>
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
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              className="text-center"
            />
          )}
        </FormField>
      )}
      {alert ? <Alert variant="error">{alert}</Alert> : null}
      {ended ? null : (
        <Button type="submit" loading={sending} disabled={code.length !== 6}>
          Verify
        </Button>
      )}
      <Button
        type="button"
        variant="secondary"
        disabled={secondsLeft > 0 || sending}
        onClick={() => void sendCode(step.phone)}
      >
        {secondsLeft > 0 ? `Send a new code in ${secondsLeft} s` : 'Send a new code'}
      </Button>
      <Button type="button" variant="secondary" onClick={changeNumber}>
        Change the number
      </Button>
    </form>
  )
}

export default PhoneVerification
