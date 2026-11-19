import { useEffect, useRef } from 'react'
import { useVideoCall } from '../hooks/useVideoCall'
import type { CallStatus, VideoToken } from '../types'
import CallControls from './CallControls'
import CallStatusLine from './CallStatusLine'
import VideoGrid from './VideoGrid'

// In these states there is no call on screen, only the status line
const NO_CALL: ReadonlySet<CallStatus['kind']> = new Set([
  'not-open',
  'hung-up',
  'time-over',
  'error',
])

type Props = {
  /** Must be stable (useCallback), or the call restarts on every render. */
  loadAccess: () => Promise<VideoToken>
}

function VideoRoom({ loadAccess }: Props) {
  const call = useVideoCall(loadAccess)
  const inCall = !NO_CALL.has(call.status.kind)
  const statusRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    // When the controls go away, the focus would fall to <body>: move it to the message instead
    if (!inCall) {
      statusRef.current?.focus()
    }
  }, [inCall])

  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-bold text-balance text-brand-dark">Video visit</h1>
      <CallStatusLine status={call.status} ref={statusRef} />
      {/* Hidden, never removed: Vonage needs the element for our own camera from the start */}
      <div hidden={!inCall}>
        <VideoGrid
          ownRole={call.ownRole}
          ownVideoRef={call.ownVideoRef}
          remotes={call.remotes}
          showRemote={call.showRemote}
        />
      </div>
      {inCall && (
        <CallControls
          microphoneOn={call.microphoneOn}
          cameraOn={call.cameraOn}
          onToggleMicrophone={call.toggleMicrophone}
          onToggleCamera={call.toggleCamera}
          onHangUp={call.hangUp}
        />
      )}
    </section>
  )
}

export default VideoRoom
