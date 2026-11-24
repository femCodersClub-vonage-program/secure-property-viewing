import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import RoomLinks from './RoomLinks'

// Shaped as in specs/video-visit.md, "API"
const visitorLink = { role: 'VISITOR', token: 'visitor-token-1' }
const newVisitorLink = { role: 'VISITOR', token: 'visitor-token-2' }
const guestLink = { role: 'GUEST', token: 'guest-token-1' }
const ROOM = `${window.location.origin}/visits/room#`
const ROOM_LINKS = 'POST /api/visits/18/room-links'

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status < 400 ? 'application/json' : 'application/problem+json' },
  })

const problem = (status: number, code: string, detail: string) =>
  json({ title: 'Error', status, detail, code }, status)

const fetchMock = vi.fn<typeof fetch>()
let answers: (() => Response)[] = []

function serve(...responses: (() => Response)[]) {
  answers = [...answers, ...responses]
}

function roomLinkCalls() {
  return fetchMock.mock.calls.filter(
    ([input, init]) => `${(init?.method ?? 'GET').toUpperCase()} ${String(input)}` === ROOM_LINKS,
  )
}

function rolesRequested() {
  return roomLinkCalls().map(([, init]) => {
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    return typeof body === 'object' && body !== null && 'role' in body ? body.role : undefined
  })
}

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
}

beforeEach(() => {
  answers = []
  fetchMock.mockImplementation(async (input, init) => {
    const key = `${(init?.method ?? 'GET').toUpperCase()} ${String(input)}`
    const answer = key === ROOM_LINKS ? answers.shift() : undefined
    if (!answer) throw new Error(`No answer prepared for ${key}`)
    return answer()
  })
  vi.stubGlobal('fetch', fetchMock)
  document.cookie = 'XSRF-TOKEN=test-token; path=/'
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  Reflect.deleteProperty(navigator, 'clipboard')
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

function renderLinks({ createdBefore = false, onFirstVisitorLink = vi.fn() } = {}) {
  render(
    <StrictMode>
      <RoomLinks
        visitId={18}
        opensAt="10:50"
        createdBefore={createdBefore}
        onFirstVisitorLink={onFirstVisitorLink}
      />
    </StrictMode>,
  )
  return onFirstVisitorLink
}

function section(name: string) {
  return screen.getByRole('region', { name })
}

describe('RoomLinks', () => {
  it('creates the visitor link once on arrival and shows it as a link to the room', async () => {
    serve(() => json(visitorLink, 201))
    const onFirstVisitorLink = renderLinks()

    const field = await screen.findByRole('textbox', { name: 'Your link' })
    expect(field).toHaveValue(`${ROOM}visitor-token-1`)
    // Created on arrival, so it leaves the focus on the page heading
    expect(field).not.toHaveFocus()
    expect(screen.getByText('Your link is ready.')).toHaveAttribute('role', 'status')
    expect(
      screen.getByText(
        "This link is your only way into the room. Save it now: we can't send it to you again.",
      ),
    ).toBeInTheDocument()
    // StrictMode runs the effect twice: a second request would replace the link just shown
    expect(rolesRequested()).toEqual(['VISITOR'])
    expect(onFirstVisitorLink).toHaveBeenCalledTimes(1)
    expect(new Headers(roomLinkCalls()[0][1]?.headers).get('X-XSRF-TOKEN')).toBe('test-token')
  })

  it('says when the room opens', async () => {
    serve(() => json(visitorLink, 201))
    renderLinks()

    expect(
      await screen.findByText(
        "The room opens at 10:50, 10 minutes before your visit, so you can check your camera. The agent joins from the agency's side.",
      ),
    ).toBeInTheDocument()
  })

  it('copies the visitor link and says so', async () => {
    const writeText = vi.fn(async () => undefined)
    stubClipboard(writeText)
    serve(() => json(visitorLink, 201))
    renderLinks()

    fireEvent.click(await screen.findByRole('button', { name: 'Copy your link' }))

    expect(
      await within(section('Your link to the video visit')).findByText('Copied.'),
    ).toHaveAttribute('role', 'status')
    expect(writeText).toHaveBeenCalledWith(`${ROOM}visitor-token-1`)
  })

  it('selects the link to copy by hand when the clipboard is not available', async () => {
    serve(() => json(visitorLink, 201))
    renderLinks()

    fireEvent.click(await screen.findByRole('button', { name: 'Copy your link' }))

    const field = screen.getByRole<HTMLInputElement>('textbox', { name: 'Your link' })
    expect(
      await within(section('Your link to the video visit')).findByText(
        "The link is selected: copy it with your device's copy option.",
      ),
    ).toHaveAttribute('role', 'status')
    expect(field).toHaveFocus()
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, field.value.length])
  })

  it('selects the link when the browser refuses the clipboard', async () => {
    stubClipboard(async () => {
      throw new DOMException('Denied', 'NotAllowedError')
    })
    serve(() => json(visitorLink, 201))
    renderLinks()

    fireEvent.click(await screen.findByRole('button', { name: 'Copy your link' }))

    expect(
      await within(section('Your link to the video visit')).findByText(
        "The link is selected: copy it with your device's copy option.",
      ),
    ).toHaveAttribute('role', 'status')
  })

  it('creates the link to share only when the visitor asks for it', async () => {
    serve(
      () => json(visitorLink, 201),
      () => json(guestLink, 201),
    )
    renderLinks()
    await screen.findByRole('textbox', { name: 'Your link' })
    expect(rolesRequested()).toEqual(['VISITOR'])

    fireEvent.click(screen.getByRole('button', { name: 'Get a link to share' }))

    const field = await screen.findByRole('textbox', { name: 'Link to share' })
    expect(field).toHaveValue(`${ROOM}guest-token-1`)
    // The link replaces the button that was pressed, so the focus moves to it
    await waitFor(() => expect(field).toHaveFocus())
    expect(screen.getByRole('button', { name: 'Copy the link to share' })).toBeInTheDocument()
    expect(rolesRequested()).toEqual(['VISITOR', 'GUEST'])
  })

  it('after a reload, asks before replacing the visitor link and lets her get a new one', async () => {
    serve(() => json(newVisitorLink, 201))
    const onFirstVisitorLink = renderLinks({ createdBefore: true })

    expect(screen.getByRole('alert')).toHaveTextContent(
      "For your safety, your link is only shown once. If you saved it, you're all set. If not, get a new one: your previous link will stop working.",
    )
    expect(
      screen.getByText(
        'If you already shared a link, it still works. Need one again? Get a new link to share: everyone who uses it joins the same call as a guest.',
      ),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Get a new link' }))

    const field = await screen.findByRole('textbox', { name: 'Your link' })
    expect(field).toHaveValue(`${ROOM}visitor-token-2`)
    await waitFor(() => expect(field).toHaveFocus())
    expect(onFirstVisitorLink).not.toHaveBeenCalled()
  })

  it('shows the error and tries again when the visitor link fails', async () => {
    serve(
      () => new Response(null, { status: 500 }),
      () => json(visitorLink, 201),
    )
    renderLinks()

    expect(await screen.findByRole('alert')).toHaveTextContent(SYSTEM_ERROR_MESSAGE)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('textbox', { name: 'Your link' })).toHaveValue(
      `${ROOM}visitor-token-1`,
    )
  })

  it('says the most links to share have been asked for when the server refuses another', async () => {
    serve(
      () => json(visitorLink, 201),
      () =>
        problem(
          409,
          'VIDEO_INVITE_LIMIT_REACHED',
          'This visit already has 4 guest links, the most it can have.',
        ),
    )
    renderLinks()
    await screen.findByRole('textbox', { name: 'Your link' })

    fireEvent.click(screen.getByRole('button', { name: 'Get a link to share' }))

    expect(
      await within(section('Invite others to the visit')).findByRole('alert'),
    ).toHaveTextContent(
      'You have asked for the most links to share that one visit can have. The links you already shared still work.',
    )
    // The button was disabled while loading, so it gets the focus back
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Get a link to share' })).toHaveFocus(),
    )
  })

  it('explains that links only come from the browser that booked the visit', async () => {
    serve(() => problem(404, 'NOT_FOUND', 'This visit was not found.'))
    renderLinks()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Links can only be created from the browser that booked the visit, shortly after booking. If you saved your link, use it to enter the room.',
    )
  })

  it('shows the message of the server when the room has closed', async () => {
    serve(() =>
      problem(
        409,
        'VIDEO_VISIT_NOT_OPEN',
        'This visit has ended or was canceled, so its room is closed.',
      ),
    )
    renderLinks()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This visit has ended or was canceled, so its room is closed.',
    )
    await waitFor(() => expect(rolesRequested()).toEqual(['VISITOR']))
  })
})
