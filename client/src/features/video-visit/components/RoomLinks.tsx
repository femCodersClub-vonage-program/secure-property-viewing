import { Clock, Link2, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Alert, Button } from '../../../components/ui'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import { createRoomLink } from '../api'
import { OPENS_MINUTES_BEFORE, roomLinkUrl } from '../room'
import type { RoomLinkRole } from '../types'
import CopyableLink from './CopyableLink'

type Props = {
  visitId: number
  /** When the room opens, in Madrid time, such as '10:50'. */
  opensAt: string
  /** True when this page already created the visitor link before it was reloaded. */
  createdBefore: boolean
  /** Called when the visitor link is first requested, so a reload knows not to replace it. */
  onFirstVisitorLink: () => void
}

// `byClick` keeps the focus with the visitor: on the button while it loads or fails, and on the
// new link once it replaces the button
type LinkState =
  | { status: 'idle' }
  | { status: 'creating'; byClick: boolean; retry: boolean }
  | { status: 'error'; message: string; byClick: boolean }
  | { status: 'ready'; url: string; byClick: boolean }

const sectionHeading = 'font-display text-2xl font-bold text-balance text-brand-dark'

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === 'VIDEO_INVITE_LIMIT_REACHED') {
    return 'You have asked for the most links to share that one visit can have. The links you already shared still work.'
  }
  if (error instanceof ApiError && error.code === 'NOT_FOUND') {
    return 'Links can only be created from the browser that booked the visit, shortly after booking. If you saved your link, use it to enter the room.'
  }
  return error instanceof ApiError ? error.message : SYSTEM_ERROR_MESSAGE
}

async function requestLink(
  visitId: number,
  role: RoomLinkRole,
  setState: (state: LinkState) => void,
  { byClick, retry }: { byClick: boolean; retry: boolean },
) {
  setState({ status: 'creating', byClick, retry })
  try {
    const link = await createRoomLink(visitId, role)
    setState({ status: 'ready', url: roomLinkUrl(link.token), byClick })
  } catch (error) {
    setState({ status: 'error', message: errorMessage(error), byClick })
  }
}

function visitorStatusText(visitor: LinkState): string {
  if (visitor.status === 'creating' && !visitor.byClick) return 'Creating your link…'
  if (visitor.status === 'ready') return 'Your link is ready.'
  return ''
}

/** The visitor's own room link and the link she shares with her guests, on A6. */
function RoomLinks({ visitId, opensAt, createdBefore, onFirstVisitorLink }: Props) {
  const [visitor, setVisitor] = useState<LinkState>(
    createdBefore ? { status: 'idle' } : { status: 'creating', byClick: false, retry: false },
  )
  const [guest, setGuest] = useState<LinkState>({ status: 'idle' })
  // A second request would replace the first visitor link, so it is only asked for once per page
  const visitorLinkRequested = useRef(createdBefore)
  const visitorButtonRef = useRef<HTMLButtonElement>(null)
  const guestButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (visitorLinkRequested.current) return
    visitorLinkRequested.current = true
    onFirstVisitorLink()
    void requestLink(visitId, 'VISITOR', setVisitor, { byClick: false, retry: false })
  }, [visitId, onFirstVisitorLink])

  // A loading button is disabled and loses the focus, so it gets it back if the request fails
  useEffect(() => {
    if (visitor.status === 'error' && visitor.byClick) visitorButtonRef.current?.focus()
  }, [visitor])
  useEffect(() => {
    if (guest.status === 'error') guestButtonRef.current?.focus()
  }, [guest])

  const visitorFailed =
    visitor.status === 'error' || (visitor.status === 'creating' && visitor.retry)

  return (
    <>
      <section aria-labelledby="visitor-link-heading" className="flex flex-col gap-3">
        <h2 id="visitor-link-heading" className={sectionHeading}>
          Your link to the video visit
        </h2>
        <p
          role="status"
          className={
            visitor.status === 'creating' && !visitor.byClick
              ? 'font-body text-text-muted'
              : 'sr-only'
          }
        >
          {visitorStatusText(visitor)}
        </p>
        {visitor.status === 'ready' ? (
          <>
            <p className="font-body text-text-default">
              This link is your only way into the room. Save it now: we can't send it to you again.
            </p>
            <CopyableLink
              id="visitor-link"
              label="Your link"
              url={visitor.url}
              copyLabel="Copy your link"
              buttonVariant="primary"
              focusOnShow={visitor.byClick}
            />
          </>
        ) : visitor.status === 'creating' && !visitor.byClick ? null : (
          <>
            {visitor.status === 'error' ? (
              <Alert variant="error">{visitor.message}</Alert>
            ) : visitor.status === 'idle' ? (
              <Alert variant="warning">
                For your safety, your link is only shown once. If you saved it, you're all set. If
                not, get a new one: your previous link will stop working.
              </Alert>
            ) : null}
            <Button
              ref={visitorButtonRef}
              variant="secondary"
              className="min-h-12"
              loading={visitor.status === 'creating'}
              onClick={() =>
                void requestLink(visitId, 'VISITOR', setVisitor, {
                  byClick: true,
                  retry: visitor.status === 'error',
                })
              }
            >
              <RefreshCw aria-hidden="true" className="size-5" />
              {visitorFailed ? 'Try again' : 'Get a new link'}
            </Button>
          </>
        )}
        <p className="flex gap-2 font-body text-sm text-text-muted">
          <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          The room opens at {opensAt}, {OPENS_MINUTES_BEFORE} minutes before your visit, so you can
          check your camera. The agent joins from the agency's side.
        </p>
      </section>

      <section
        aria-labelledby="guest-link-heading"
        className="flex flex-col gap-3 border-t border-border pt-6"
      >
        <h2 id="guest-link-heading" className={sectionHeading}>
          Invite others to the visit
        </h2>
        {guest.status === 'ready' ? (
          <>
            <p className="font-body text-text-default">
              Share this link with everyone you want in the call. They join as guests, with no
              account.
            </p>
            <CopyableLink
              id="guest-link"
              label="Link to share"
              url={guest.url}
              copyLabel="Copy the link to share"
              buttonVariant="secondary"
              focusOnShow={guest.byClick}
            />
          </>
        ) : (
          <>
            <p className="font-body text-text-default">
              {createdBefore
                ? 'If you already shared a link, it still works. Need one again? Get a new link to share: everyone who uses it joins the same call as a guest.'
                : "Want the people you'll live with, or anyone else, to see the property with you? Get one link and share it with all of them. Everyone who uses it joins the same call as a guest."}
            </p>
            {guest.status === 'error' ? <Alert variant="error">{guest.message}</Alert> : null}
            <Button
              ref={guestButtonRef}
              variant="secondary"
              className="min-h-12"
              loading={guest.status === 'creating'}
              onClick={() =>
                void requestLink(visitId, 'GUEST', setGuest, { byClick: true, retry: false })
              }
            >
              <Link2 aria-hidden="true" className="size-5" />
              Get a link to share
            </Button>
          </>
        )}
      </section>
    </>
  )
}

export default RoomLinks
