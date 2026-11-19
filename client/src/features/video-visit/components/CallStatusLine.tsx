import type { Ref } from 'react'
import { statusMessage } from '../callStatus'
import type { CallStatus } from '../types'

type Props = {
  status: CallStatus
  ref?: Ref<HTMLParagraphElement>
}

function CallStatusLine({ status, ref }: Props) {
  return (
    // role="status" is a polite live region: the change is announced without interrupting.
    // tabIndex={-1} lets the room move the focus here, without adding it to the Tab order
    <p ref={ref} role="status" tabIndex={-1} className="font-body text-text-default">
      {statusMessage(status)}
    </p>
  )
}

export default CallStatusLine
