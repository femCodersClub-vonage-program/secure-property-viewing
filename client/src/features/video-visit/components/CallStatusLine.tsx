import { statusMessage } from '../callStatus'
import type { CallStatus } from '../types'

type Props = { status: CallStatus }

function CallStatusLine({ status }: Props) {
  // role="status" is a polite live region: the change is announced without interrupting
  return (
    <p role="status" className="font-body text-text-default">
      {statusMessage(status)}
    </p>
  )
}

export default CallStatusLine