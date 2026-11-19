import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VideoToken } from './types'
import { joinVideoCall, type VideoCallEvents } from './videoClient'

type Listener = (event: unknown) => void

// A small fake of the SDK, only with what videoClient.ts uses. It keeps the listeners,
// so each test can fire what Vonage would
const sdk = vi.hoisted(() => {
  const sessionListeners = new Map<string, Listener>()
  const publisherListeners = new Map<string, Listener>()
  const subscriber = { id: 'subscriber-1' }
  const session = {
    on: vi.fn((name: string, listener: Listener) => {
      sessionListeners.set(name, listener)
    }),
    connect: { promise: vi.fn(async () => session) },
    publish: vi.fn(),
    subscribe: vi.fn(() => subscriber),
    unsubscribe: vi.fn(),
    disconnect: vi.fn(async () => {}),
  }
  const publisher = {
    on: vi.fn((name: string, listener: Listener) => {
      publisherListeners.set(name, listener)
    }),
    publishAudio: vi.fn(),
    publishVideo: vi.fn(),
  }
  return {
    sessionListeners,
    publisherListeners,
    session,
    publisher,
    subscriber,
    initSession: vi.fn(() => session),
    initPublisher: vi.fn(() => publisher),
  }
})

// The dynamic import() in videoClient.ts gets this fake too
vi.mock('@vonage/client-sdk-video', () => ({
  default: { initSession: sdk.initSession, initPublisher: sdk.initPublisher },
}))

const access: VideoToken = {
  applicationId: 'app-1',
  sessionId: 'session-1',
  token: 'video-token-1',
  role: 'VISITOR',
  closesAt: new Date('2026-11-23T10:45:00Z'),
}

// A stream as the SDK sends it: the server put the role in the connection data
const agencyStream = { streamId: 'stream-1', connection: { data: 'role=AGENCY' } }

// Fails if nobody listens to that name: a misspelled event name would be caught here
function fire(listeners: Map<string, Listener>, name: string, event: unknown = {}) {
  const listener = listeners.get(name)
  if (listener === undefined) {
    throw new Error(`Nobody listens to "${name}"`)
  }
  listener(event)
}

function fakeEvents() {
  return {
    onRemoteJoined: vi.fn(),
    onRemoteLeft: vi.fn(),
    onPermissionsDenied: vi.fn(),
    onReconnecting: vi.fn(),
    onReconnected: vi.fn(),
    onDisconnected: vi.fn(),
  } satisfies VideoCallEvents
}

beforeEach(() => {
  vi.clearAllMocks()
  sdk.sessionListeners.clear()
  sdk.publisherListeners.clear()
})

describe('joinVideoCall', () => {
  it('joins the session with its token and publishes into our own tile', async () => {
    const ownVideo = document.createElement('div')

    await joinVideoCall(access, ownVideo, fakeEvents())

    expect(sdk.initSession).toHaveBeenCalledWith('app-1', 'session-1')
    expect(sdk.session.connect.promise).toHaveBeenCalledWith('video-token-1')
    expect(sdk.initPublisher).toHaveBeenCalledWith(
      ownVideo,
      expect.objectContaining({ showControls: false }),
    )
    expect(sdk.session.publish).toHaveBeenCalledWith(sdk.publisher)
  })

  it('listens before connecting, so no event is missed', async () => {
    await joinVideoCall(access, document.createElement('div'), fakeEvents())

    const firstListener = sdk.session.on.mock.invocationCallOrder[0]
    const connect = sdk.session.connect.promise.mock.invocationCallOrder[0]
    expect(firstListener).toBeLessThan(connect)
  })

  it('reports who joins, with the role from the connection data, and shows their video', async () => {
    const events = fakeEvents()
    const call = await joinVideoCall(access, document.createElement('div'), events)
    const tile = document.createElement('div')

    fire(sdk.sessionListeners, 'streamCreated', { stream: agencyStream })
    const stopShowing = call.showRemote('stream-1', tile)

    expect(events.onRemoteJoined).toHaveBeenCalledWith({ id: 'stream-1', role: 'AGENCY' })
    expect(sdk.session.subscribe).toHaveBeenCalledWith(
      agencyStream,
      tile,
      expect.objectContaining({ showControls: false }),
    )
    stopShowing()
    expect(sdk.session.unsubscribe).toHaveBeenCalledWith(sdk.subscriber)
  })

  it('reports who leaves, and shows nothing for a video that has gone', async () => {
    const events = fakeEvents()
    const call = await joinVideoCall(access, document.createElement('div'), events)

    fire(sdk.sessionListeners, 'streamCreated', { stream: agencyStream })
    fire(sdk.sessionListeners, 'streamDestroyed', { stream: agencyStream })
    call.showRemote('stream-1', document.createElement('div'))

    expect(events.onRemoteLeft).toHaveBeenCalledWith('stream-1')
    expect(sdk.session.subscribe).not.toHaveBeenCalled()
  })

  it('reports denied permissions, reconnections and the end of the connection', async () => {
    const events = fakeEvents()
    await joinVideoCall(access, document.createElement('div'), events)

    fire(sdk.publisherListeners, 'accessDenied')
    fire(sdk.sessionListeners, 'sessionReconnecting')
    fire(sdk.sessionListeners, 'sessionReconnected')
    fire(sdk.sessionListeners, 'sessionDisconnected')

    expect(events.onPermissionsDenied).toHaveBeenCalledOnce()
    expect(events.onReconnecting).toHaveBeenCalledOnce()
    expect(events.onReconnected).toHaveBeenCalledOnce()
    expect(events.onDisconnected).toHaveBeenCalledOnce()
  })

  it('turns the microphone and camera off, and leaves the session', async () => {
    const call = await joinVideoCall(access, document.createElement('div'), fakeEvents())

    call.setMicrophone(false)
    call.setCamera(false)
    call.leave()

    expect(sdk.publisher.publishAudio).toHaveBeenCalledWith(false)
    expect(sdk.publisher.publishVideo).toHaveBeenCalledWith(false)
    expect(sdk.session.disconnect).toHaveBeenCalled()
  })
})
