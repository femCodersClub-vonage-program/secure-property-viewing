import type { LucideIcon } from 'lucide-react'
import { Card, Link } from '../../../components/ui'

type StatCardProps = {
  label: string
  value: number
  linkLabel: string
  to: string
  icon: LucideIcon
}

function StatCard({ label, value, linkLabel, to, icon: Icon }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-md bg-linear-135 from-brand-primary to-brand-accent text-text-light"
      >
        <Icon className="size-5" />
      </span>
      <p className="text-sm font-semibold text-text-muted">{label}</p>
      <p className="font-dashboard-display text-5xl leading-none font-bold tracking-tight text-brand-dark tabular-nums">
        {value}
      </p>
      <Link to={to}>{linkLabel}</Link>
    </Card>
  )
}

export default StatCard
