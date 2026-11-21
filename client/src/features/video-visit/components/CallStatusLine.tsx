import type { Ref } from 'react'
import { statusMessage } from '../callStatus'
import type { CallStatus } from '../types'

type Props = {
  status: CallStatus
  ref?: Ref<HTMLParagraphElement>
  prominent?: boolean
}

const regularClasses = 'font-body text-text-default'
const prominentClasses = 'font-display text-3xl font-bold text-balance text-brand-dark'

function CallStatusLine({ status, ref, prominent = false }: Props) {
  return (
    // role="status" is a polite live region: the change is announced without interrupting.
    // tabIndex={-1} lets the room move the focus here, without adding it to the Tab order
    <p
      ref={ref}
      role="status"
      tabIndex={-1}
      className={prominent ? prominentClasses : regularClasses}
    >
      {statusMessage(status)}
    </p>
  )
}

export default CallStatusLine
