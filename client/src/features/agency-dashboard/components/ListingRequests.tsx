import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Alert, Button, Card, Link } from '../../../components/ui'
import { formatPrice } from '../../property-browsing'
import { errorMessage, isListingRequestStatus, isSignedOut } from '../api'
// Sample data until the endpoints of #57 are in dev: then this import becomes '../api'
import { getListingRequests } from '../listingRequestsSample'
import type { ListingRequestStatus, ListingRequestSummary } from '../types'
import { madridDateTime } from '../visitTime'
import DashboardHeading from './DashboardHeading'
import DataTable, { type Column } from './DataTable'
import RequestStatus from './RequestStatus'
import SignInRedirect from './SignInRedirect'
import Tabs, { type TabItem } from './Tabs'

// The answer remembers its tab, so the screen can tell when it belongs to another one
type Load =
  | { status: 'loading' }
  | { status: 'error'; tab: ListingRequestStatus; message: string }
  | { status: 'ready'; tab: ListingRequestStatus; requests: ListingRequestSummary[] }
  | { status: 'signed-out' }

const TABS: TabItem[] = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
]

const TAB_TEXT: Record<ListingRequestStatus, { caption: string; loading: string; empty: string }> =
  {
    PENDING: {
      caption: 'Pending requests',
      loading: 'Loading pending requests…',
      empty: 'No pending requests',
    },
    APPROVED: {
      caption: 'Approved requests',
      loading: 'Loading approved requests…',
      empty: 'No approved requests',
    },
    REJECTED: {
      caption: 'Rejected requests',
      loading: 'Loading rejected requests…',
      empty: 'No rejected requests',
    },
  }

const OPERATION_LABEL = { RENT: 'Rent', SALE: 'Sale' } as const

const columns: Column<ListingRequestSummary>[] = [
  { header: 'Owner', cell: (request) => request.ownerName },
  {
    header: 'Property',
    // The title is the real link to the details (docs/design-system.md → Tables)
    cell: (request) => (
      <span className="flex flex-col items-end gap-0.5 md:items-start">
        <Link to={`/agency/listing-requests/${request.id}`}>{request.title}</Link>
        <span className="text-sm text-text-muted">
          {OPERATION_LABEL[request.operation]} ·{' '}
          {formatPrice(request.priceEuros, request.operation)}
        </span>
      </span>
    ),
  },
  {
    header: 'Received',
    align: 'end',
    cell: (request) => (
      <time dateTime={request.createdAt}>{madridDateTime(request.createdAt)}</time>
    ),
  },
  { header: 'Status', cell: (request) => <RequestStatus status={request.status} /> },
]

/** D2: the listing requests of one status, chosen with tabs and kept in the address as ?status= */
function ListingRequests() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  // Anything else in the address, or nothing, opens the requests that need attention
  const tab: ListingRequestStatus = isListingRequestStatus(statusParam) ? statusParam : 'PENDING'

  const [load, setLoad] = useState<Load>({ status: 'loading' })
  // Each "Try again" adds one, so the effect asks again for the same tab
  const [attempt, setAttempt] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    getListingRequests(tab, controller.signal)
      .then((requests) => {
        // An answer that arrives after the agent changed tab belongs to the old one
        if (controller.signal.aborted) return
        setLoad({ status: 'ready', tab, requests })
      })
      .catch((error: unknown) => {
        // Leaving the page or changing tab cancels the call: that is not an error to show
        if (controller.signal.aborted) return
        if (isSignedOut(error)) {
          setLoad({ status: 'signed-out' })
          return
        }
        setLoad({ status: 'error', tab, message: errorMessage(error) })
      })
    return () => controller.abort()
  }, [tab, attempt])

  if (load.status === 'signed-out') {
    // It keeps ?status= in the return path, so the agent comes back to the same tab
    return <SignInRedirect />
  }

  // Derived while rendering: an answer for another tab means this one is still loading
  const shown: Load = load.status !== 'loading' && load.tab !== tab ? { status: 'loading' } : load
  const text = TAB_TEXT[tab]

  function selectTab(id: string) {
    if (!isListingRequestStatus(id) || id === tab) return
    // replace: changing tab is not a new page, so Back leaves the list instead of going through the tabs
    setSearchParams({ status: id }, { replace: true })
  }

  function tryAgain() {
    setLoad({ status: 'loading' })
    setAttempt((count) => count + 1)
    // "Try again" is about to disappear, so the focus goes to the page heading (WCAG 2.4.3)
    headingRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-7">
      <DashboardHeading ref={headingRef}>Listing requests</DashboardHeading>

      <Card>
        <Tabs label="Request status" tabs={TABS} selectedId={tab} onSelect={selectTab}>
          {shown.status === 'loading' && (
            <p role="status" className="text-text-muted">
              {text.loading}
            </p>
          )}

          {shown.status === 'error' && (
            <div className="flex flex-col items-start gap-4">
              <Alert variant="error">{shown.message}</Alert>
              <Button variant="secondary" onClick={tryAgain}>
                Try again
              </Button>
            </div>
          )}

          {shown.status === 'ready' &&
            (shown.requests.length > 0 ? (
              <DataTable
                caption={text.caption}
                columns={columns}
                rows={shown.requests}
                getRowKey={(request) => request.id}
              />
            ) : (
              <p className="text-text-muted">{text.empty}</p>
            ))}
        </Tabs>
      </Card>
    </div>
  )
}

export default ListingRequests
