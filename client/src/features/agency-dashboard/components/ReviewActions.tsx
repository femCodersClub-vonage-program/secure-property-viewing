import { useId, useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { Button, FormField, Textarea } from '../../../components/ui'
import {
  errorMessage,
  isAlreadyReviewed,
  isInvalidReason,
  isSignedOut,
  REJECTION_REASON_MAX_LENGTH,
} from '../api'
// Sample data until the endpoints of #57 are in dev: then this import becomes '../api'
import { approveListingRequest, rejectListingRequest } from '../listingRequestDetailsSample'
import type { ListingRequestStatus } from '../types'

type ReviewedStatus = Exclude<ListingRequestStatus, 'PENDING'>

type Props = {
  requestId: number
  status: ListingRequestStatus
  /** The review was saved: the screen shows the new status, the message and, for a rejection, its reason */
  onReviewed: (status: ReviewedStatus, message: string, rejectionReason?: string) => void
  /** Someone reviewed it first (409): the screen loads it again and shows the server's message */
  onAlreadyReviewed: (message: string) => void
  /** Any other failure, with a message that is safe to show */
  onFailed: (message: string) => void
  onSignedOut: () => void
}

// docs/design-system.md → States → Unavailable actions
const UNAVAILABLE_REASON: Record<ReviewedStatus, string> = {
  APPROVED: 'This request was already approved',
  REJECTED: 'This request was already rejected',
}

const MAX_LENGTH_TEXT = REJECTION_REASON_MAX_LENGTH.toLocaleString('en-US')
const REASON_HINT = `Up to ${MAX_LENGTH_TEXT} characters. The owner can ask to see it.`
const REASON_REQUIRED = 'Write why you are rejecting this request.'
const REASON_TOO_LONG = `Write the reason in ${MAX_LENGTH_TEXT} characters or fewer.`
// The server's own text for the field is written to follow its name, so the screen uses its own
const REASON_REFUSED = `Write why you are rejecting this request, in ${MAX_LENGTH_TEXT} characters or fewer.`

// The same rules as the server, so the agent finds out before sending
function reasonProblem(reason: string): string | undefined {
  if (reason === '') return REASON_REQUIRED
  if (reason.length > REJECTION_REASON_MAX_LENGTH) return REASON_TOO_LONG
  return undefined
}

/** "Approve and publish" and "Reject" in D3. "Reject" asks for the reason first. */
function ReviewActions({
  requestId,
  status,
  onReviewed,
  onAlreadyReviewed,
  onFailed,
  onSignedOut,
}: Props) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string>()
  const [sending, setSending] = useState<'approve' | 'reject'>()
  const rejectButton = useRef<HTMLButtonElement>(null)
  const reasonId = useId()
  const unavailableId = useId()

  if (status !== 'PENDING') {
    return (
      <div className="flex flex-col items-start gap-3">
        <div className="flex flex-wrap gap-3">
          <Button disabled aria-describedby={unavailableId}>
            Approve and publish
          </Button>
          <Button variant="secondary" disabled aria-describedby={unavailableId}>
            Reject
          </Button>
        </div>
        <p id={unavailableId} className="text-sm text-text-muted">
          {UNAVAILABLE_REASON[status]}
        </p>
      </div>
    )
  }

  // Textarea has no ref, so the field is found by the id FormField gives it
  function focusReason() {
    document.getElementById(reasonId)?.focus()
  }

  function handleFailure(error: unknown) {
    if (isSignedOut(error)) {
      onSignedOut()
      return
    }
    if (isAlreadyReviewed(error)) {
      onAlreadyReviewed(errorMessage(error))
      return
    }
    onFailed(errorMessage(error))
  }

  async function approve() {
    setSending('approve')
    try {
      await approveListingRequest(requestId)
      onReviewed('APPROVED', 'Request approved and published.')
    } catch (error) {
      handleFailure(error)
    } finally {
      setSending(undefined)
    }
  }

  function cancelReject() {
    // flushSync puts "Reject" back on screen at once, so the focus can return to it
    flushSync(() => {
      setRejecting(false)
      setReason('')
      setReasonError(undefined)
    })
    rejectButton.current?.focus()
  }

  async function reject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = reason.trim()
    const problem = reasonProblem(trimmed)
    setReasonError(problem)
    if (problem !== undefined) {
      focusReason()
      return
    }
    setSending('reject')
    try {
      await rejectListingRequest(requestId, trimmed)
      onReviewed('REJECTED', 'Request rejected.', trimmed)
    } catch (error) {
      if (isInvalidReason(error)) {
        setReasonError(REASON_REFUSED)
        focusReason()
        return
      }
      handleFailure(error)
    } finally {
      setSending(undefined)
    }
  }

  if (rejecting) {
    return (
      <form onSubmit={(event) => void reject(event)} noValidate className="flex flex-col gap-4">
        {/* autoFocus: the field appears because the agent pressed "Reject", so the focus moves into it.
            required tells assistive technology the reason is needed; noValidate leaves the messages to the form */}
        <FormField
          id={reasonId}
          label="Reason for rejecting"
          hint={REASON_HINT}
          error={reasonError}
        >
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              autoFocus
              required
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          )}
        </FormField>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="danger" loading={sending === 'reject'}>
            Reject request
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={sending === 'reject'}
            onClick={cancelReject}
          >
            Cancel
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button loading={sending === 'approve'} onClick={() => void approve()}>
        Approve and publish
      </Button>
      <Button
        ref={rejectButton}
        variant="secondary"
        disabled={sending === 'approve'}
        onClick={() => setRejecting(true)}
      >
        Reject
      </Button>
    </div>
  )
}

export default ReviewActions
