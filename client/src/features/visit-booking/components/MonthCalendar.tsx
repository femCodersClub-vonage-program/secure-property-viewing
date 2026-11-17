import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button, Card } from '../../../components/ui'
import { dayLabel, monthGrid, monthLabel } from '../calendar'

type Props = {
  month: string
  previousMonth: string | undefined
  nextMonth: string | undefined
  freeDays: ReadonlySet<string>
  selectedDay: string | undefined
  onSelectDay: (day: string) => void
  onShowMonth: (month: string) => void
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function MonthCalendar({
  month,
  previousMonth,
  nextMonth,
  freeDays,
  selectedDay,
  onSelectDay,
  onShowMonth,
}: Props) {
  const title = useRef<HTMLHeadingElement>(null)
  const [movedByVisitor, setMovedByVisitor] = useState(false)

  // The arrow just pressed can become disabled, so the focus goes to the new month's name
  useEffect(() => {
    if (movedByVisitor) title.current?.focus()
  }, [month, movedByVisitor])

  function showMonth(target: string | undefined) {
    if (!target) return
    setMovedByVisitor(true)
    onShowMonth(target)
  }

  return (
    <Card className="flex flex-col gap-3">
      <section aria-labelledby="calendar-month" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            shape="circle"
            aria-label="Previous month"
            disabled={!previousMonth}
            onClick={() => showMonth(previousMonth)}
            className="size-11"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Button>
          <h2
            id="calendar-month"
            ref={title}
            tabIndex={-1}
            className="font-display text-xl text-brand-dark"
          >
            {monthLabel(month)}
          </h2>
          <Button
            variant="secondary"
            shape="circle"
            aria-label="Next month"
            disabled={!nextMonth}
            onClick={() => showMonth(nextMonth)}
            className="size-11"
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </Button>
        </div>

        {/* The day buttons carry their full names, so the visual grid stays out of the screen reader */}
        <div
          aria-hidden="true"
          className="grid grid-cols-7 gap-1 text-center font-body text-xs font-bold tracking-wide text-text-muted uppercase"
        >
          {WEEKDAYS.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthGrid(month).map((day, index) => {
            if (!day) {
              return <span key={`empty-${index}`} aria-hidden="true" />
            }
            const dayNumber = Number(day.slice(8))
            if (!freeDays.has(day)) {
              return (
                <span
                  key={day}
                  aria-hidden="true"
                  className="mx-auto flex aspect-square w-full max-w-11 items-center justify-center font-body text-sm text-text-muted"
                >
                  {dayNumber}
                </span>
              )
            }
            const selected = day === selectedDay
            return (
              <Button
                key={day}
                variant={selected ? 'primary' : 'secondary'}
                shape="circle"
                aria-pressed={selected}
                aria-label={dayLabel(day)}
                onClick={() => onSelectDay(day)}
                className="mx-auto w-full max-w-11"
              >
                {dayNumber}
              </Button>
            )
          })}
        </div>

        <p className="flex items-center gap-2 font-body text-sm text-text-muted">
          <span
            aria-hidden="true"
            className="size-3.5 flex-none rounded-pill border border-brand-primary"
          />
          Days with a circle have free times.
        </p>
      </section>
    </Card>
  )
}

export default MonthCalendar
