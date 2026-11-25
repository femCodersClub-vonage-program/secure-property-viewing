import type { ReactNode } from 'react'
import { Card } from '../../../components/ui'

interface StepCardProps {
  number: number
  title: string
  children: ReactNode
  className?: string
}

/** One of the three blocks of the calendar screen. The order is in the page, so the number is decorative. */
function StepCard({ number, title, children, className }: StepCardProps) {
  return (
    <Card flush className={['flex flex-col gap-5 p-4 sm:p-6', className ?? ''].join(' ').trim()}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-linear-to-br from-brand-primary to-brand-accent font-display text-xl font-bold text-text-light"
        >
          {number}
        </span>
        <h2 className="font-display text-xl font-semibold text-brand-dark">{title}</h2>
      </div>
      {children}
    </Card>
  )
}

export default StepCard
