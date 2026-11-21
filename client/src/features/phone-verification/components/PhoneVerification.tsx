import { Clock, Mail, ShieldCheck, ShieldX, Smartphone } from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react'
import { Alert, Button, Card, FormField, Input } from '../../../components/ui'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import {
  checkPhoneVerificationCode,
  checkSilentCode,
  moveToSmsCode,
  startPhoneVerification,
} from '../api'
import {
  clearSilentCheck,
  isVirtualOperatorNumber,
  openCheckUrl,
  saveSilentCheck,
  shouldTrySilentAuth,
} from '../silentAuth'
import type {
  PhoneVerificationPurpose,
  ResumedSilentCheck,
  SilentCheckResult,
  VerifiedPhone,
} from '../types'

type Props = {
  purpose: PhoneVerificationPurpose
  onVerified: (result: VerifiedPhone) => void
  /**
   * The host page's form. With it, the screen tries the silent check from a phone, and saves the
   * form first, because opening the check URL reloads the page.
   */
  formToKeep?: unknown
  /** A silent check the host page found when the person came back from the mobile operator. */
  resumed?: ResumedSilentCheck
}

type Checking = {
  name: 'checking'
  verificationId: number
  phone: string
  resendAvailableAt: number
}

type Step =
  | { name: 'phone' }
  | Checking
  | {
      name: 'code'
      verificationId: number
      phone: string
      resendAvailableAt: number
      resent: boolean
    }
  | { name: 'failed' }

// Where the focus goes after the screen changes, so it never falls back to the page body
type FocusTarget = 'title' | 'phone' | 'code' | 'message' | 'start-again'

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

// The server has already moved these on to the SMS step, so the code entry is all that is needed
const MOVED_TO_SMS_CODES = new Set([
  'VERIFICATION_CODE_INVALID',
  'VERIFICATION_SILENT_CHECK_UNAVAILABLE',
])

const CODE_LENGTH = 6

const NOT_VERIFIED_MESSAGE =
  "Your mobile operator couldn't confirm this number. Check it and start again."
const EXPIRED_MESSAGE = 'This verification has expired. Ask for a new code.'

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

function checkingFrom(resumed: ResumedSilentCheck | undefined): Checking | undefined {
  if (!resumed) {
    return undefined
  }
  const { verificationId, phone, resendAvailableAt } = resumed.saved
  return {
    name: 'checking',
    verificationId,
    phone,
    resendAvailableAt: Date.parse(resendAvailableAt),
  }
}

function PhoneVerification({ purpose, onVerified, formToKeep, resumed }: Props) {
  const [step, setStep] = useState<Step>(() => checkingFrom(resumed) ?? { name: 'phone' })
  const [phone, setPhone] = useState(() => resumed?.saved.phone ?? '')
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const [alert, setAlert] = useState<string>()
  const [ended, setEnded] = useState(false)
  const [sending, setSending] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  // Coming back from the operator, the form is gone, so the focus starts on the checking title
  const [focusTarget, setFocusTarget] = useState<FocusTarget | undefined>(() =>
    resumed ? 'title' : undefined,
  )

  const phoneInput = useRef<HTMLInputElement>(null)
  const codeInput = useRef<HTMLInputElement>(null)
  const message = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const startAgainButton = useRef<HTMLButtonElement>(null)
  // The silent code is checked once by Vonage, so the check must not run twice
  const resumeStarted = useRef(false)

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
    if (focusTarget === 'title') titleRef.current?.focus()
    if (focusTarget === 'phone') phoneInput.current?.focus()
    if (focusTarget === 'code') codeInput.current?.focus()
    if (focusTarget === 'message') message.current?.focus()
    if (focusTarget === 'start-again') startAgainButton.current?.focus()
  }, [focusTarget, step, ended, alert, fieldError])

  function showCodeEntry(checking: Checking) {
    setStep({
      name: 'code',
      verificationId: checking.verificationId,
      phone: checking.phone,
      resendAvailableAt: checking.resendAvailableAt,
      resent: false,
    })
    setNow(Date.now())
    setCode('')
    setFocusTarget('code')
  }

  function showNotVerified() {
    setStep({ name: 'failed' })
    setAlert(NOT_VERIFIED_MESSAGE)
    setFocusTarget('start-again')
  }

  // A +990 number has no SMS step, so it can never ask for a new code: it starts again instead
  function endVerification(checking: Checking, text: string) {
    if (isVirtualOperatorNumber(checking.phone)) {
      showNotVerified()
      return
    }
    showCodeEntry(checking)
    setEnded(true)
    setAlert(text)
    setFocusTarget('message')
  }

  async function finishSilentCheck(checking: Checking, result: SilentCheckResult) {
    setAlert(undefined)
    try {
      const update =
        result.outcome === 'code'
          ? await checkSilentCode(checking.verificationId, result.requestId, result.code)
          : await moveToSmsCode(checking.verificationId)
      if (update.status === 'VERIFIED') {
        onVerified({ verificationId: update.id, phone: checking.phone })
      } else if (update.status === 'FAILED') {
        showNotVerified()
      } else if (update.status === 'EXPIRED') {
        endVerification(checking, EXPIRED_MESSAGE)
      } else {
        showCodeEntry(checking)
      }
    } catch (error) {
      const errorCode = error instanceof ApiError ? error.code : undefined
      if (errorCode && ENDED_CODES.has(errorCode)) {
        endVerification(checking, errorMessage(error))
      } else if (errorCode && MOVED_TO_SMS_CODES.has(errorCode)) {
        showCodeEntry(checking)
      } else {
        // Vonage moves a real number on to SMS by itself after 60 seconds, so the code may still come
        showCodeEntry(checking)
        setAlert(errorMessage(error))
      }
    }
  }

  const resumeSilentCheck = useEffectEvent((checking: Checking, result: SilentCheckResult) => {
    clearSilentCheck()
    void finishSilentCheck(checking, result)
  })

  useEffect(() => {
    const checking = checkingFrom(resumed)
    if (!checking || !resumed || resumeStarted.current) {
      return
    }
    resumeStarted.current = true
    resumeSilentCheck(checking, resumed.result)
  }, [resumed])

  // A page restored from the back/forward cache does not load again, so the host page never sees
  // the saved form: the person came back without a result, and the screen asks for the SMS
  useEffect(() => {
    if (step.name !== 'checking') {
      return undefined
    }
    const checking = step
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        resumeSilentCheck(checking, { outcome: 'none' })
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [step])

  async function sendCode(phoneNumber: string, trySilentCheck: boolean) {
    setSending(true)
    setFieldError(undefined)
    setAlert(undefined)
    try {
      const silentAuth =
        trySilentCheck && formToKeep !== undefined && shouldTrySilentAuth(phoneNumber)
      const started = await startPhoneVerification(phoneNumber, purpose, silentAuth)
      const resendAvailableAt = Date.parse(started.resendAvailableAt)
      if (started.checkUrl) {
        const checking: Checking = {
          name: 'checking',
          verificationId: started.id,
          phone: phoneNumber,
          resendAvailableAt,
        }
        setStep(checking)
        // The form and its button are gone, so the focus moves to the title of the new step
        setFocusTarget('title')
        const saved = saveSilentCheck({
          verificationId: started.id,
          purpose,
          phone: phoneNumber,
          resendAvailableAt: started.resendAvailableAt,
          form: formToKeep,
        })
        // Without the saved form the person would lose their visit, so the code goes by SMS instead
        if (saved) {
          openCheckUrl(started.checkUrl)
        } else {
          void finishSilentCheck(checking, { outcome: 'none' })
        }
        return
      }
      setStep({
        name: 'code',
        verificationId: started.id,
        phone: phoneNumber,
        resendAvailableAt,
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
      const isAboutTheCode = error instanceof ApiError && error.kind === 'business'
      if (errorCode && ENDED_CODES.has(errorCode)) {
        setEnded(true)
        setAlert(errorMessage(error))
        setFocusTarget('message')
      } else if (isAboutTheCode) {
        setFieldError(errorMessage(error))
        setFocusTarget('code')
      } else {
        setAlert(errorMessage(error))
        setFocusTarget('message')
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
    void sendCode(phoneNumber, true)
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

  const statusText = {
    phone: "We'll text you a 6-digit code to check it's you.",
    checking: 'Checking your number with your mobile operator…',
    code:
      step.name === 'code'
        ? `We've sent ${step.resent ? 'a new' : 'a'} 6-digit code by SMS to ${readablePhone(step.phone)}.`
        : '',
    // The alert below says what happened, so the status has nothing to add
    failed: '',
  }[step.name]

  const title =
    step.name === 'phone'
      ? 'Verify your phone number'
      : step.name === 'checking'
        ? 'Checking your number'
        : step.name === 'failed'
          ? "We couldn't verify your number"
          : ended
            ? "Let's send you a new code"
            : 'Check your messages'

  const icon =
    step.name === 'phone' ? (
      <ShieldCheck className="size-8" />
    ) : step.name === 'checking' ? (
      <Smartphone className="size-8" />
    ) : step.name === 'failed' ? (
      <ShieldX className="size-8" />
    ) : ended ? (
      <Clock className="size-8" />
    ) : (
      <Mail className="size-8" />
    )

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
              step.name === 'failed' ? 'text-error' : ended ? 'text-warning' : 'text-brand-primary',
            ].join(' ')}
          >
            {icon}
          </span>
          <h2
            ref={titleRef}
            tabIndex={-1}
            id="phone-verification-title"
            className="font-display text-2xl font-bold text-balance text-brand-dark"
          >
            {title}
          </h2>
          {/* Mounted in every step, so a change of text is announced */}
          <p className="font-body text-pretty text-text-default" role="status">
            {statusText}
          </p>
          {step.name === 'code' ? (
            <Button type="button" variant="link" onClick={changeNumber}>
              Change the number
            </Button>
          ) : null}
        </header>

        {step.name === 'checking' ? null : step.name === 'failed' ? (
          <div className="flex flex-col gap-4">
            {alert ? <Alert variant="error">{alert}</Alert> : null}
            <Button
              ref={startAgainButton}
              type="button"
              onClick={changeNumber}
              className="min-h-12"
            >
              Start again
            </Button>
          </div>
        ) : step.name === 'phone' ? (
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
              onClick={() => void sendCode(step.phone, false)}
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
                onClick={() => void sendCode(step.phone, false)}
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
