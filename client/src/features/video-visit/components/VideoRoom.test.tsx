import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import type { VideoToken } from '../types'
import { joinVideoCall, type VideoCall, type VideoCallEvents } from '../videoClient'
import VideoRoom from './VideoRoom'

// Only our adapter is replaced: the Vonage SDK never loads in these tests
vi.mock('../videoClient', () => ({ joinVideoCall: vi.fn() }))

const HOUR = 60 * 60_000

// Shaped as in specs/video-visit.md, "API"
const access: VideoToken = {
  applicationId: 'app-1',
  sessionId: 'session-1',
  token: 'video-token-1',
  role: 'VISITOR',
  closesAt: new Date(Date.now() + HOUR),
}

// A fake call: each action is a spy, so the tests can check what the screen asked for
const call = {
  showRemote: vi.fn(() => () => {}),
  setMicrophone: vi.fn(),
  setCamera: vi.fn(),
  leave: vi.fn(),
} satisfies VideoCall

// The callbacks the hook gave the adapter, so a test can play what Vonage would report
let events: VideoCallEvents | undefined

function callEvents(): VideoCallEvents {
  if (events === undefined) {
    throw new Error('The call has not started')
  }
  return events
}

function renderRoom(loadAccess: () => Promise<VideoToken> = () => Promise.resolve(access)) {
  render(<VideoRoom loadAccess={loadAccess} />)
}

// The call has started once the screen says it's waiting for the others
const joined = () => screen.findByText(/waiting for the others/i)

beforeEach(() => {
  vi.mocked(joinVideoCall).mockImplementation(async (_access, _element, callbackEvents) => {
    events = callbackEvents
    return call
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  events = undefined
})

describe('VideoRoom', () => {
  it('joins with the access it loads and waits for the others', async () => {
    renderRoom()

    expect(screen.getByRole('status')).toHaveTextContent('Joining the visit…')
    await joined()
    expect(joinVideoCall).toHaveBeenCalledWith(access, expect.any(HTMLElement), expect.anything())
  })

  it('labels each video with the role of the person in it', async () => {
    renderRoom()
    await joined()

    act(() => {
      callEvents().onRemoteJoined({ id: 'stream-1', role: 'AGENCY' })
      callEvents().onRemoteJoined({ id: 'stream-2', role: 'GUEST' })
    })

    expect(screen.getByRole('figure', { name: 'You (Visitor)' })).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: 'Agency' })).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: 'Guest' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('You are in the visit.')
    expect(call.showRemote).toHaveBeenCalledWith('stream-1', expect.any(HTMLElement))
  })

  it('removes the video of someone who leaves', async () => {
    renderRoom()
    await joined()

    act(() => callEvents().onRemoteJoined({ id: 'stream-1', role: 'GUEST' }))
    act(() => callEvents().onRemoteLeft('stream-1'))

    expect(screen.queryByRole('figure', { name: 'Guest' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/waiting for the others/i)
  })

  it('mutes the microphone and says so with aria-pressed', async () => {
    renderRoom()
    await joined()
    const mute = screen.getByRole('button', { name: 'Mute' })

    expect(mute).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(mute)

    expect(mute).toHaveAttribute('aria-pressed', 'true')
    expect(call.setMicrophone).toHaveBeenCalledWith(false)
  })

  it('turns the camera off and says so with aria-pressed', async () => {
    renderRoom()
    await joined()
    const camera = screen.getByRole('button', { name: 'Camera off' })

    fireEvent.click(camera)

    expect(camera).toHaveAttribute('aria-pressed', 'true')
    expect(call.setCamera).toHaveBeenCalledWith(false)
  })

  it('leaves the call when hanging up, and hides the controls', async () => {
    renderRoom()
    await joined()

    fireEvent.click(screen.getByRole('button', { name: 'Hang up' }))

    expect(call.leave).toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('You left the visit.')
    expect(screen.queryByRole('button', { name: 'Mute' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveFocus()
  })

  it('explains how to allow the camera and microphone when they are denied', async () => {
    renderRoom()
    await joined()

    act(() => callEvents().onPermissionsDenied())

    expect(screen.getByRole('status')).toHaveTextContent(/allow them/i)
  })

  it('says when it is reconnecting, and when the connection is back', async () => {
    renderRoom()
    await joined()

    act(() => callEvents().onReconnecting())
    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting…')

    act(() => callEvents().onReconnected())
    expect(screen.getByRole('status')).toHaveTextContent(/waiting for the others/i)
  })

  it('says the connection was lost when the call drops without hanging up', async () => {
    renderRoom()
    await joined()

    act(() => callEvents().onDisconnected())

    expect(screen.getByRole('status')).toHaveTextContent(/connection was lost/i)
  })

  it('leaves the call at closesAt, not before, and says the time is over', async () => {
    // Fake clock: it still ticks, so findBy works, and the test can jump ahead
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const FIVE_MINUTES = 5 * 60_000
    renderRoom(() => Promise.resolve({ ...access, closesAt: new Date(Date.now() + FIVE_MINUTES) }))
    await joined()

    expect(call.leave).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(FIVE_MINUTES)
    })

    expect(screen.getByRole('status')).toHaveTextContent(/visit time is over/i)
    expect(call.leave).toHaveBeenCalled()
  })

  it('says when the room opens if it is not open yet, without joining', async () => {
    const notOpen = new ApiError({
      kind: 'business',
      message: 'The room opens 10 minutes before the visit. Come back then.',
      status: 409,
      code: 'VIDEO_VISIT_NOT_OPEN',
      problem: { opensAt: '2026-11-23T09:50:00Z' }, // 10:50 in Madrid
    })
    renderRoom(() => Promise.reject(notOpen))

    expect(await screen.findByText(/the room opens on .*10:50/i)).toBeInTheDocument()
    expect(joinVideoCall).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Hang up' })).not.toBeInTheDocument()
  })

  it('shows the message of the server when the room has closed', async () => {
    // The server sends no opensAt once the room has closed
    const closed = new ApiError({
      kind: 'business',
      message: 'This visit has ended or was canceled, so its room is closed.',
      status: 409,
      code: 'VIDEO_VISIT_NOT_OPEN',
      problem: {},
    })
    renderRoom(() => Promise.reject(closed))

    expect(
      await screen.findByText('This visit has ended or was canceled, so its room is closed.'),
    ).toBeInTheDocument()
    expect(joinVideoCall).not.toHaveBeenCalled()
  })
})

it('keeps saying you left after hanging up, when the call then reports the disconnection', async () => {
  renderRoom()
  await joined()

  fireEvent.click(screen.getByRole('button', { name: 'Hang up' }))
  act(() => callEvents().onDisconnected())

  expect(screen.getByRole('status')).toHaveTextContent('You left the visit.')
})

it('labels a video without a known role as Participant', async () => {
  renderRoom()
  await joined()

  act(() => callEvents().onRemoteJoined({ id: 'stream-1', role: undefined }))

  expect(screen.getByRole('figure', { name: 'Participant' })).toBeInTheDocument()
})

it('shows the generic message when joining fails for a reason people cannot fix', async () => {
  renderRoom(() => Promise.reject(new Error('Network down')))

  expect(await screen.findByText(SYSTEM_ERROR_MESSAGE)).toBeInTheDocument()
})

it('says the camera or microphone could not start, and keeps the call', async () => {
  renderRoom()
  await joined()

  act(() => callEvents().onMediaFailed())

  expect(screen.getByRole('status')).toHaveTextContent(/couldn't start/i)
  expect(screen.getByRole('button', { name: 'Hang up' })).toBeInTheDocument()
})

it('keeps the permissions message when the same denial also fails to publish', async () => {
  renderRoom()
  await joined()

  act(() => {
    callEvents().onPermissionsDenied()
    callEvents().onMediaFailed()
  })

  expect(screen.getByRole('status')).toHaveTextContent(/allow them/i)
})
