import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Alert, Button } from '../../../components/ui'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import {
  clearSilentCheck,
  PhoneVerification,
  type ResumedSilentCheck,
  type VerifiedPhone,
} from '../../phone-verification'
import { submitListingRequest } from '../api'
import {
  EMPTY_FORM,
  OWNER_FIELDS,
  fromServerErrors,
  readSavedListingForm,
  toListingRequest,
} from '../listingForm'
import { LISTING_SUBMITTED_PATH } from '../paths'
import type { ListingFormData, ListingStep } from '../types'
import {
  validateOwnerDetails,
  toE164Phone,
  validatePropertyDetails,
  type ListingFieldErrors,
} from '../validation'
import OwnerDetailsStep from './OwnerDetailsStep'
import PropertyDetailsStep from './PropertyDetailsStep'
import StepIndicator from './StepIndicator'

const pageHeading = 'font-display text-3xl font-bold text-balance text-brand-dark'

type Props = {
  resumedCheck?: ResumedSilentCheck
}

// Holds the current step, the data and the errors of B2 to B4, so "Back" never loses what was entered
function OwnerListingForm({ resumedCheck }: Props) {
  const navigate = useNavigate()
  const [restored] = useState(() =>
    resumedCheck ? readSavedListingForm(resumedCheck.saved.form) : undefined,
  )
  const [step, setStep] = useState<ListingStep>(restored ? 'verification' : 'details')
  const [data, setData] = useState<ListingFormData>(restored ?? EMPTY_FORM)
  const [pendingCheck, setPendingCheck] = useState(restored ? resumedCheck : undefined)
  const [errors, setErrors] = useState<ListingFieldErrors>({})
  const [notice, setNotice] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  // A new number mounts a fresh verification screen, once the previous one has been used
  const [verificationAttempt, setVerificationAttempt] = useState(0)
  const [stepChangedByOwner, setStepChangedByOwner] = useState(false)
  const progressRef = useRef<HTMLParagraphElement>(null)
  const noticeRef = useRef<HTMLDivElement>(null)

  // Each step replaces the button that was pressed, so the focus moves to the notice or the progress
  useEffect(() => {
    if (notice) {
      noticeRef.current?.focus()
    } else if (stepChangedByOwner) {
      progressRef.current?.focus()
    }
  }, [notice, step, stepChangedByOwner])

  // A saved check whose form is missing or broken is useless, so it is deleted
  useEffect(() => {
    if (resumedCheck && !restored) {
      clearSilentCheck()
    }
  }, [resumedCheck, restored])

  function goTo(next: ListingStep) {
    setPendingCheck(undefined)
    // A notice belongs to the step it appeared on, and would keep the focus from the progress
    setNotice(undefined)
    setStepChangedByOwner(true)
    setStep(next)
  }

  // Copies the form and changes only one field, so the rest stays as it was
  function updateField<K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) {
    setData((current) => ({ ...current, [field]: value }))
  }

  function continueFromDetails() {
    const found = validateOwnerDetails(data)
    setErrors(found)
    if (Object.keys(found).length === 0) {
      goTo('property')
    }
  }

  function continueFromProperty() {
    const found = validatePropertyDetails(data)
    setErrors(found)
    if (Object.keys(found).length === 0) {
      goTo('verification')
    }
  }

  async function submit(verified: VerifiedPhone) {
    const request = toListingRequest(data, verified)
    if (!request) {
      goTo('property')
      return
    }
    setSubmitting(true)
    setNotice(undefined)
    // The verification screen is used up: after an error, a new one starts without the old check
    setPendingCheck(undefined)
    setVerificationAttempt((count) => count + 1)
    try {
      await submitListingRequest(request)
      // replace: "back" from the confirmation never returns to a form already sent
      navigate(LISTING_SUBMITTED_PATH, { replace: true })
    } catch (error) {
      showSubmitError(error)
    } finally {
      setSubmitting(false)
    }
  }

  function showSubmitError(error: unknown) {
    if (!(error instanceof ApiError)) {
      setNotice(SYSTEM_ERROR_MESSAGE)
      return
    }
    if (error.code === 'VALIDATION_FAILED') {
      // Each message goes next to its field, on the step where that field is
      const found = fromServerErrors(error.fieldErrors)
      setErrors(found)
      // With no field to point at, the owner stays here and reads the server's message
      if (Object.keys(found).length > 0) {
        const ownerFieldFailed = OWNER_FIELDS.some((field) => found[field] !== undefined)
        goTo(ownerFieldFailed ? 'details' : 'property')
        return
      }
    }
    setNotice(error.message)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className={pageHeading}>List my property</h1>
      <StepIndicator ref={progressRef} current={step} />

      {step === 'details' && (
        <OwnerDetailsStep
          data={data}
          errors={errors}
          onChange={updateField}
          onContinue={continueFromDetails}
        />
      )}
      {step === 'property' && (
        <PropertyDetailsStep
          data={data}
          errors={errors}
          onChange={updateField}
          onBack={() => goTo('details')}
          onContinue={continueFromProperty}
        />
      )}
      {step === 'verification' && (
        <div className="flex flex-col gap-4">
          {notice ? (
            <div ref={noticeRef} tabIndex={-1}>
              <Alert variant="error">{notice}</Alert>
            </div>
          ) : null}
          {submitting ? (
            <p role="status" className="font-body text-text-default">
              Sending your request…
            </p>
          ) : (
            <PhoneVerification
              key={verificationAttempt}
              purpose="LISTING_REQUEST"
              initialPhone={toE164Phone(data.ownerPhone)}
              formToKeep={data}
              resumed={pendingCheck}
              onVerified={(verified) => void submit(verified)}
            />
          )}
          <Button
            variant="secondary"
            className="self-start"
            disabled={submitting}
            onClick={() => goTo('property')}
          >
            Back
          </Button>
        </div>
      )}
    </div>
  )
}

export default OwnerListingForm
