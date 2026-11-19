import { Check, Clock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge, type BadgeVariant } from '../../../components/ui'
import type { ListingRequestStatus } from '../types'

type StatusDisplay = { label: string; variant: BadgeVariant; icon: ReactNode }

const statusDisplay: Record<ListingRequestStatus, StatusDisplay> = {
  PENDING: {
    label: 'Pending',
    variant: 'warning',
    icon: <Clock aria-hidden="true" className="size-3" />,
  },
  APPROVED: {
    label: 'Approved',
    variant: 'approved',
    icon: <Check aria-hidden="true" className="size-3" />,
  },
  // A rejected request is a decision, not an error: neutral gray, as in docs/design-system.md
  REJECTED: { label: 'Rejected', variant: 'pending', icon: null },
}

function RequestStatus({ status }: { status: ListingRequestStatus }) {
  const { label, variant, icon } = statusDisplay[status]
  return (
    <Badge variant={variant} className="inline-flex items-center gap-1">
      {icon}
      {label}
    </Badge>
  )
}

export default RequestStatus
