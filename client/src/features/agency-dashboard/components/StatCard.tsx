import { Card, Link } from '../../../components/ui'

type StatCardProps = {
  label: string
  value: number
  linkLabel: string
  to: string
}

function StatCard({ label, value, linkLabel, to }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="text-3xl font-bold text-text-default tabular-nums">{value}</p>
      <Link to={to}>{linkLabel}</Link>
    </Card>
  )
}

export default StatCard
