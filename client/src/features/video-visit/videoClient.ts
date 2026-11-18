// The only file that talks to Vonage. The rest of the feature uses joinVideoCall(),
// so tests mock this file instead of the whole SDK
import OT from '@vonage/client-sdk-video'
import { roleFromConnectionData } from './roles'
import type { VideoRole, VideoToken } from './types'

// Our own buttons and labels replace Vonage's default ones, and each video fills its tile
const VIDEO_PROPERTIES = {
  insertMode: 'append',
  width: '100%',
  height: '100%',
  showControls: false,
} as const satisfies OT.WidgetProperties

/** Someone else in the call. `role` is undefined if their connection data has no known role. */
export type RemoteVideo = {
  id: string
  role: VideoRole | undefined
}

/** What the call tells the screen. */
export type VideoCallEvents = {
  onRemoteJoined: (video: RemoteVideo) => void
  onRemoteLeft: (id: string) => void
  onPermissionsDenied: () => void
  onReconnecting: () => void
  onReconnected: () => void
  onDisconnected: () => void
}

/** What the screen can do with the call. */
export type VideoCall = {
  showRemote: (id: string, element: HTMLElement) => () => void
  setMicrophone: (on: boolean) => void
  setCamera: (on: boolean) => void
  leave: () => void
}

/** Joins the session, publishes camera and microphone into `ownVideo`, and reports what happens. */
export async function joinVideoCall(
  access: VideoToken,
  ownVideo: HTMLElement,
  events: VideoCallEvents,
): Promise<VideoCall> {
  const session = OT.initSession(access.applicationId, access.sessionId)
  // Videos that arrived and wait for their tile, by id
  const streams = new Map<string, OT.Stream>()

  // Listeners go before connect(), so no event is missed
  session.on('streamCreated', ({ stream }) => {
    streams.set(stream.streamId, stream)
    events.onRemoteJoined({
      id: stream.streamId,
      role: roleFromConnectionData(stream.connection.data),
    })
  })
  session.on('streamDestroyed', ({ stream }) => {
    streams.delete(stream.streamId)
    events.onRemoteLeft(stream.streamId)
  })
  session.on('sessionReconnecting', events.onReconnecting)
  session.on('sessionReconnected', events.onReconnected)
  session.on('sessionDisconnected', events.onDisconnected)

  // Throws if the token is not valid, and the hook shows the error
  await session.connect.promise(access.token)

  const publisher = OT.initPublisher(ownVideo, VIDEO_PROPERTIES)
  // The browser asks for camera and microphone here. If they're denied, the screen explains how to allow them
  publisher.on('accessDenied', events.onPermissionsDenied)
  session.publish(publisher)

  return {
    showRemote(id, element) {
      const stream = streams.get(id)
      if (stream === undefined) {
        return () => {}
      }
      const subscriber = session.subscribe(stream, element, VIDEO_PROPERTIES)
      return () => session.unsubscribe(subscriber)
    },
    setMicrophone(on) {
      publisher.publishAudio(on)
    },
    setCamera(on) {
      publisher.publishVideo(on)
    },
    leave() {
      void session.disconnect() // `void`: we don't wait, the page already shows "hung up"
    },
  }
}