import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Alert, Button } from '../../../components/ui'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import { PhoneVerification, type VerifiedPhone } from '../../phone-verification'
import { submitListingRequest } from '../api'
import { EMPTY_FORM, OWNER_FIELDS, fromServerErrors, toListingRequest } from '../listingForm'
import { LISTING_SUBMITTED_PATH } from '../paths'
import type { ListingFormData, ListingStep } from '../types'
import {
  validateOwnerDetails,
  validatePropertyDetails,
  type ListingFieldErrors,
} from '../validation'
import OwnerDetailsStep from './OwnerDetailsStep'
import PropertyDetailsStep from './PropertyDetailsStep'
import StepIndicator from './StepIndicator'

const pageHeading = 'font-display text-3xl font-bold text-balance text-brand-dark'

// Holds the current step, the data and the errors of B2 to B4, so "Back" never loses what was entered
function OwnerListingForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState<ListingStep>('details')
  const [data, setData] = useState<ListingFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<ListingFieldErrors>({})
  const [notice, setNotice] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  // A new number mounts a fresh verification screen, as when the server rejects the verification
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

  function goTo(next: ListingStep) {
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
      setNotice(undefined)
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
      const ownerFieldFailed = OWNER_FIELDS.some((field) => found[field] !== undefined)
      goTo(ownerFieldFailed ? 'details' : 'property')
      return
    }
    if (error.code === 'PHONE_VERIFICATION_INVALID') {
      setVerificationAttempt((count) => count + 1)
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
