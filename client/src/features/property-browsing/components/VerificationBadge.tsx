import { Badge } from '../../../components/ui'

interface VerificationBadgeProps {
  verified: boolean
  className?: string
}

function VerificationBadge({ verified, className }: VerificationBadgeProps) {
  return (
    <Badge variant={verified ? 'approved' : 'pending'} className={className}>
      {verified ? 'Verified agency' : 'Unverified agency'}
    </Badge>
  )
}

export default VerificationBadge
