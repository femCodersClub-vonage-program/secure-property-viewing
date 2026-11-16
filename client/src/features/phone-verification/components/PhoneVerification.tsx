import { Clock, Mail, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Alert, Button, Card, FormField, Input } from '../../../components/ui'
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
type FocusTarget = 'phone' | 'code' | 'message'

const USE_OF_THE_NUMBER: Record<PhoneVerificationPurpose, string> = {
  VISIT: 'Used to confirm your visit and send you its messages.',
  LISTING_REQUEST: 'Used to confirm your listing request and send you its updates.',
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

// Groups of three from the end, so "+34600000000" reads "+34 600 000 000"
function readablePhone(phone: string): string {
  const digits = phone.replace(/^\+/, '')
  const groups = digits.match(/\d{1,3}(?=(\d{3})*$)/g) ?? [digits]
  return `${phone.startsWith('+') ? '+' : ''}${groups.join(' ')}`
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
  const message = useRef<HTMLDivElement>(null)

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
    if (focusTarget === 'message') message.current?.focus()
  }, [focusTarget, step, ended, alert, fieldError])

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
        // The send button was disabled while sending, so the focus goes back to the field to fix it
        setFocusTarget('phone')
      } else {
        setAlert(errorMessage(error))
        // The resend button was disabled while sending, so the focus has to land somewhere useful
        if (step.name === 'code') setFocusTarget('message')
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
        setFocusTarget('message')
      } else {
        setFieldError(errorMessage(error))
        setFocusTarget('code')
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
      ? `We've sent ${step.resent ? 'a new' : 'a'} 6-digit code by SMS to ${readablePhone(step.phone)}.`
      : "We'll text you a 6-digit code to check it's you."

  const title =
    step.name === 'phone'
      ? 'Verify your phone number'
      : ended
        ? "Let's send you a new code"
        : 'Check your messages'

  const countdown =
    secondsLeft > 0 ? (
      <p className="font-body text-text-muted">
        You can ask for a new code in {secondsLeft}&nbsp;s.
      </p>
    ) : null

  return (
    <section aria-labelledby="phone-verification-title">
      <Card className="flex flex-col gap-8 px-6 py-8 sm:px-10">
        <header className="flex flex-col items-center gap-3 text-center">
          <span
            aria-hidden="true"
            className={[
              'flex size-18 items-center justify-center rounded-pill bg-surface-input',
              ended ? 'text-warning' : 'text-brand-primary',
            ].join(' ')}
          >
            {step.name === 'phone' ? (
              <ShieldCheck className="size-8" />
            ) : ended ? (
              <Clock className="size-8" />
            ) : (
              <Mail className="size-8" />
            )}
          </span>
          <h2
            id="phone-verification-title"
            className="font-display text-2xl font-bold text-balance text-brand-dark"
          >
            {title}
          </h2>
          {/* Mounted in both steps, so a change of text is announced */}
          <p className="font-body text-pretty text-text-default" role="status">
            {statusText}
          </p>
          {step.name === 'code' ? (
            <Button type="button" variant="link" onClick={changeNumber}>
              Change the number
            </Button>
          ) : null}
        </header>

        {step.name === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} noValidate className="flex flex-col gap-5">
            <FormField
              id="verification-phone"
              label="Phone number"
              hint={`Such as +34 600 000 000. ${USE_OF_THE_NUMBER[purpose]}`}
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
            <Button type="submit" loading={sending} className="min-h-12">
              Send code
            </Button>
          </form>
        ) : ended ? (
          <div className="flex flex-col gap-4">
            <div ref={message} tabIndex={-1} className="empty:hidden">
              {alert ? <Alert variant="warning">{alert}</Alert> : null}
            </div>
            <Button
              type="button"
              loading={sending}
              disabled={secondsLeft > 0}
              onClick={() => void sendCode(step.phone)}
              className="min-h-12"
            >
              Send a new code
            </Button>
            {countdown}
          </div>
        ) : (
          <>
            <form onSubmit={handleCodeSubmit} noValidate className="flex flex-col gap-5">
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
                    variant="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    // Keeps the first 6 digits, so a pasted "482 931" still works
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))
                    }
                  />
                )}
              </FormField>
              <div ref={message} tabIndex={-1} className="empty:hidden">
                {alert ? <Alert variant="error">{alert}</Alert> : null}
              </div>
              <Button type="submit" loading={sending} className="min-h-12">
                Verify
              </Button>
            </form>
            <div className="flex flex-col items-center gap-1 border-t border-border pt-6 text-center">
              <p className="font-body text-text-default">Didn't get it?</p>
              {countdown}
              <Button
                type="button"
                variant="link"
                disabled={secondsLeft > 0 || sending}
                onClick={() => void sendCode(step.phone)}
              >
                Send a new code
              </Button>
            </div>
          </>
        )}
      </Card>
    </section>
  )
}

export default PhoneVerification
