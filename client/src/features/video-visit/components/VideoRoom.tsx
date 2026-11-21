import { useEffect, useRef, type ReactNode } from 'react'
import { useVideoCall } from '../hooks/useVideoCall'
import type { CallStatus, VideoToken } from '../types'
import CallControls from './CallControls'
import CallStatusLine from './CallStatusLine'
import VideoGrid from './VideoGrid'
import { PhoneOff } from 'lucide-react'

// In these states there is no call on screen, only the status line
const NO_CALL: ReadonlySet<CallStatus['kind']> = new Set([
  'not-open',
  'hung-up',
  'time-over',
  'error',
])
const CALL_ENDED: ReadonlySet<CallStatus['kind']> = new Set(['hung-up', 'time-over'])
const sectionClasses = 'flex flex-col gap-6'
const endedSectionClasses = 'flex flex-col items-center gap-6 py-12 text-center'

const headingClasses =
  'flex items-center gap-3 font-display text-3xl font-bold text-balance text-brand-dark'

type Props = {
  /** Must be stable (useCallback), or the call restarts on every render. */
  loadAccess: () => Promise<VideoToken>
  afterCall?: ReactNode
}

function VideoRoom({ loadAccess, afterCall }: Props) {
  const call = useVideoCall(loadAccess)
  const inCall = !NO_CALL.has(call.status.kind)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const callEnded = CALL_ENDED.has(call.status.kind)

  useEffect(() => {
    // When the controls go away, the focus would fall to <body>: move it to the message instead
    if (!inCall) {
      statusRef.current?.focus()
    }
  }, [inCall])

  return (
    <section className={callEnded ? endedSectionClasses : sectionClasses}>
      {callEnded && (
        <span
          aria-hidden="true"
          className="flex size-18 items-center justify-center rounded-pill bg-surface-input text-brand-dark"
        >
          <PhoneOff className="size-8" />
        </span>
      )}
      <h1 className={callEnded ? 'sr-only' : headingClasses}>
        <span aria-hidden="true" className="size-3 shrink-0 rounded-pill bg-brand-accent" />
        Video visit
      </h1>
      <CallStatusLine status={call.status} ref={statusRef} prominent={callEnded} />
      {/* The stage, dark as in screen 7 of the screen map. Hidden, never removed:
        Vonage needs the element for our own camera from the start */}
      <div hidden={!inCall} className="rounded-lg bg-brand-dark p-4">
        <VideoGrid
          ownRole={call.ownRole}
          ownVideoRef={call.ownVideoRef}
          remotes={call.remotes}
          showRemote={call.showRemote}
        />
      </div>
      {/* The controls go right under the stage */}
      {inCall && (
        <CallControls
          microphoneOn={call.microphoneOn}
          cameraOn={call.cameraOn}
          onToggleMicrophone={call.toggleMicrophone}
          onToggleCamera={call.toggleCamera}
          onHangUp={call.hangUp}
        />
      )}
      {callEnded && afterCall}
    </section>
  )
}

export default VideoRoom
