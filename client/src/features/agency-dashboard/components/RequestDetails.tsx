import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Alert, Button, Card, Link, type AlertVariant } from '../../../components/ui'
import { formatBedrooms, formatPrice } from '../../property-browsing'
import { errorMessage, isNotFound, isSignedOut } from '../api'
import { OPERATION_LABEL, PROPERTY_TYPE_LABEL } from '../listingRequestLabels'
// Sample data until the endpoints of #57 are in dev: then this import becomes '../api'
import { getListingRequest } from '../listingRequestDetailsSample'
import type { ListingRequestDetails, ListingRequestStatus } from '../types'
import { madridDateTime } from '../visitTime'
import DashboardHeading from './DashboardHeading'
import ListingRequestNotFound from './ListingRequestNotFound'
import RequestStatus from './RequestStatus'
import ReviewActions from './ReviewActions'
import SignInRedirect from './SignInRedirect'

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not-found'; message: string }
  | { status: 'ready'; request: ListingRequestDetails }
  | { status: 'signed-out' }

// What happened after a review, shown under the heading
type Notice = { variant: AlertVariant; text: string }

// A card named by its heading, so it is a region a screen reader can jump to
function Section({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <Card className="flex h-full flex-col gap-4">
        <h2 id={headingId} className="font-dashboard-display text-2xl font-bold text-brand-dark">
          {title}
        </h2>
        {children}
      </Card>
    </section>
  )
}

// Label and value, styled like the table headers and cells (docs/design-system.md → Tables).
// multiline keeps the line breaks the owner or the agent wrote
function Detail({
  label,
  multiline = false,
  children,
}: {
  label: string
  multiline?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm font-bold text-text-muted">{label}</dt>
      <dd className={multiline ? 'whitespace-pre-line' : undefined}>{children}</dd>
    </div>
  )
}

function DateTime({ value }: { value: string }) {
  return <time dateTime={value}>{madridDateTime(value)}</time>
}

/** D3: the owner, the property and the review of one listing request, with the review actions. */
function RequestDetails({ id }: { id: number }) {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  // Each "Try again" or review adds one, so the effect asks for the request again
  const [attempt, setAttempt] = useState(0)
  const [notice, setNotice] = useState<Notice>()
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Set by "Try again": the heading changes when the request arrives, so it gets the focus again then
  const refocusHeading = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    getListingRequest(id, controller.signal)
      .then((request) => {
        if (controller.signal.aborted) return
        setLoad({ status: 'ready', request })
      })
      .catch((error: unknown) => {
        // Leaving the page cancels the call: that is not an error to show
        if (controller.signal.aborted) return
        if (isSignedOut(error)) {
          setLoad({ status: 'signed-out' })
          return
        }
        if (isNotFound(error)) {
          setLoad({ status: 'not-found', message: errorMessage(error) })
          return
        }
        // After a review the request is already on screen with its new status and message.
        // A failed reload keeps them, instead of hiding a saved review behind an error
        setLoad((current) =>
          current.status === 'ready' ? current : { status: 'error', message: errorMessage(error) },
        )
      })
    return () => controller.abort()
  }, [id, attempt])

  useEffect(() => {
    if (refocusHeading.current && load.status !== 'loading') {
      refocusHeading.current = false
      headingRef.current?.focus()
    }
  }, [load.status])

  if (load.status === 'signed-out') {
    return <SignInRedirect />
  }

  if (load.status === 'not-found') {
    return <ListingRequestNotFound message={load.message} />
  }

  // The button that was pressed stops being available, so the focus goes to the heading,
  // and the message under it says what happened (WCAG 2.4.3)
  function showNotice(next: Notice) {
    setNotice(next)
    headingRef.current?.focus()
  }

  function handleReviewed(status: Exclude<ListingRequestStatus, 'PENDING'>, text: string) {
    // The new status shows at once. Loading the request again brings when it was reviewed
    setLoad((current) =>
      current.status === 'ready'
        ? { status: 'ready', request: { ...current.request, status } }
        : current,
    )
    // The message takes the color of the status badge: green for an approval, and neutral for a
    // rejection, which is a decision and not an error (docs/design-system.md → Status badges)
    showNotice({ variant: status === 'APPROVED' ? 'success' : 'info', text })
    setAttempt((count) => count + 1)
  }

  function handleAlreadyReviewed(text: string) {
    showNotice({ variant: 'warning', text })
    setAttempt((count) => count + 1)
  }

  function tryAgain() {
    setLoad({ status: 'loading' })
    setNotice(undefined)
    refocusHeading.current = true
    setAttempt((count) => count + 1)
    headingRef.current?.focus()
  }

  if (load.status !== 'ready') {
    // Until the request arrives there is no title, so the page keeps an h1 with the screen's name
    return (
      <div className="flex flex-col items-start gap-4">
        <DashboardHeading ref={headingRef}>Request details</DashboardHeading>
        {load.status === 'loading' ? (
          <p role="status" className="text-text-muted">
            Loading the request…
          </p>
        ) : (
          <>
            <Alert variant="error">{load.message}</Alert>
            <Button variant="secondary" onClick={tryAgain}>
              Try again
            </Button>
          </>
        )}
      </div>
    )
  }

  const { request } = load

  return (
    // wrap-anywhere: the owner writes the title, the address and the description, and one long word
    // must never push the screen wider than a 320 px phone (WCAG 1.4.10)
    <div className="flex flex-col gap-7 wrap-anywhere">
      {/* The tab where the request is now: after a review, it opens the tab of its new status */}
      <Link to={`/agency/listing-requests?status=${request.status}`} className="self-start">
        Back to listing requests
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <DashboardHeading ref={headingRef}>{request.title}</DashboardHeading>
        <RequestStatus status={request.status} />
      </div>

      {notice && <Alert variant={notice.variant}>{notice.text}</Alert>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Review">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Received">
              <DateTime value={request.createdAt} />
            </Detail>
            <Detail label="Reviewed">
              {request.reviewedAt === null ? (
                'Not reviewed yet'
              ) : (
                <DateTime value={request.reviewedAt} />
              )}
            </Detail>
            {request.rejectionReason !== null && (
              <div className="sm:col-span-2">
                <Detail label="Reason for rejecting" multiline>
                  {request.rejectionReason}
                </Detail>
              </div>
            )}
          </dl>
          <ReviewActions
            requestId={request.id}
            status={request.status}
            onReviewed={handleReviewed}
            onAlreadyReviewed={handleAlreadyReviewed}
            onFailed={(text) => showNotice({ variant: 'error', text })}
            onSignedOut={() => setLoad({ status: 'signed-out' })}
          />
        </Section>

        <Section title="Owner">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Name">{request.ownerName}</Detail>
            <Detail label="Phone">
              <Link href={`tel:${request.ownerPhone}`}>{request.ownerPhone}</Link>
            </Detail>
          </dl>
        </Section>
      </div>

      <Section title="Property">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Type">{PROPERTY_TYPE_LABEL[request.propertyType]}</Detail>
          <Detail label="Operation">{OPERATION_LABEL[request.operation]}</Detail>
          <Detail label="Price">{formatPrice(request.priceEuros, request.operation)}</Detail>
          <Detail label="Neighborhood">{request.area}</Detail>
          <Detail label="Address">{request.address}</Detail>
          <Detail label="Bedrooms">{formatBedrooms(request.bedrooms, 'bedroom')}</Detail>
          <Detail label="Size">{request.sizeM2} m²</Detail>
          <Detail label="Floor">{request.floor === null ? 'Not given' : request.floor}</Detail>
          <div className="sm:col-span-2 lg:col-span-3">
            <Detail label="Description" multiline>
              {request.description}
            </Detail>
          </div>
        </dl>
      </Section>
    </div>
  )
}

export default RequestDetails
