import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react'
import { Button } from '../../../components/ui'

type Props = {
  microphoneOn: boolean
  cameraOn: boolean
  onToggleMicrophone: () => void
  onToggleCamera: () => void
  onHangUp: () => void
}

function CallControls({
  microphoneOn,
  cameraOn,
  onToggleMicrophone,
  onToggleCamera,
  onHangUp,
}: Props) {
  return (
    // flex-wrap keeps the three buttons usable at 320 px and at 200% zoom
    <div className="flex flex-wrap justify-center gap-3">
      <Button
        variant="secondary"
        shape="pill"
        aria-pressed={!microphoneOn}
        onClick={onToggleMicrophone}
      >
        {microphoneOn ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
        Mute
      </Button>
      <Button variant="secondary" shape="pill" aria-pressed={!cameraOn} onClick={onToggleCamera}>
        {cameraOn ? <Video aria-hidden="true" /> : <VideoOff aria-hidden="true" />}
        Camera off
      </Button>
      <Button variant="danger" shape="pill" onClick={onHangUp}>
        <PhoneOff aria-hidden="true" />
        Hang up
      </Button>
    </div>
  )
}

export default CallControls
