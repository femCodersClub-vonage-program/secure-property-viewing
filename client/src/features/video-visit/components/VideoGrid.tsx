import { useEffect, useId, useRef, type Ref } from 'react'
import { ROLE_LABELS } from '../roles'
import type { VideoRole } from '../types'
import type { RemoteVideo } from '../videoClient'

const tileClasses = 'aspect-video w-full overflow-hidden rounded-md bg-brand-dark'

type TileProps = { label: string; videoRef: Ref<HTMLDivElement> }

// Vonage puts the <video> inside the div. The label is real text, so everyone can read who is who
function VideoTile({ label, videoRef }: TileProps) {
  // A unique id per tile, so each figure is named by its own caption
  const captionId = useId()

  return (
    // aria-labelledby makes the name explicit: not every screen reader takes it from figcaption
    <figure aria-labelledby={captionId} className="flex flex-col gap-2">
      <div ref={videoRef} className={tileClasses} />
      <figcaption id={captionId} className="font-body font-semibold text-brand-dark">
        {label}
      </figcaption>
    </figure>
  )
}

type RemoteTileProps = {
  video: RemoteVideo
  showRemote: (id: string, element: HTMLElement) => () => void
}

function RemoteVideoTile({ video, showRemote }: RemoteTileProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current === null) {
      return
    }
    // The cleanup unsubscribes, so StrictMode's second mount doesn't show the video twice
    return showRemote(video.id, ref.current)
  }, [video.id, showRemote])

  const label = video.role === undefined ? 'Participant' : ROLE_LABELS[video.role]
  return <VideoTile label={label} videoRef={ref} />
}

type Props = {
  ownRole: VideoRole | undefined
  ownVideoRef: Ref<HTMLDivElement>
  remotes: RemoteVideo[]
  showRemote: (id: string, element: HTMLElement) => () => void
}

function VideoGrid({ ownRole, ownVideoRef, remotes, showRemote }: Props) {
  const ownLabel = ownRole === undefined ? 'You' : `You (${ROLE_LABELS[ownRole]})`

  return (
    // One column on a phone, two on a tablet or a phone in landscape, three on a wide screen
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <VideoTile label={ownLabel} videoRef={ownVideoRef} />
      {remotes.map((video) => (
        <RemoteVideoTile key={video.id} video={video} showRemote={showRemote} />
      ))}
    </div>
  )
}

export default VideoGrid
