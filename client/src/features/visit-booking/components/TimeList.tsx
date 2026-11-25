import { useState } from 'react'
import { Button } from '../../../components/ui'
import { dayLabel, isMorning, madridTime } from '../calendar'
import type { Slot } from '../types'

type Props = {
  day: string
  slots: Slot[]
  selectedSlotId: number | undefined
  onSelect: (slot: Slot) => void
}

type Period = 'morning' | 'afternoon'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
]

function periodOf(slot: Slot): Period {
  return isMorning(slot.startsAt) ? 'morning' : 'afternoon'
}

function TimeList({ day, slots, selectedSlotId, onSelect }: Props) {
  const [pickedPeriod, setPickedPeriod] = useState<Period>()

  const byPeriod: Record<Period, Slot[]> = {
    morning: slots.filter((slot) => periodOf(slot) === 'morning'),
    afternoon: slots.filter((slot) => periodOf(slot) === 'afternoon'),
  }
  const selected = slots.find((slot) => slot.id === selectedSlotId)
  // The visitor's choice, then the chosen time's, then the first with free times on this day
  const preferred = pickedPeriod ?? (selected ? periodOf(selected) : 'morning')
  const other: Period = preferred === 'morning' ? 'afternoon' : 'morning'
  const period = byPeriod[preferred].length > 0 ? preferred : other

  return (
    <section aria-labelledby="free-times" className="flex flex-col gap-4">
      <h3 id="free-times" className="font-body font-bold text-brand-dark">
        Free times on {dayLabel(day)}
      </h3>

      <div role="group" aria-label="Part of the day" className="grid grid-cols-2 gap-2">
        {PERIODS.map(({ value, label }) => (
          <Button
            key={value}
            variant={value === period ? 'primary' : 'secondary'}
            aria-pressed={value === period}
            disabled={byPeriod[value].length === 0}
            onClick={() => setPickedPeriod(value)}
            className="min-h-11 px-1!"
          >
            {label} ({byPeriod[value].length})
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {byPeriod[period].map((slot) => {
          const time = madridTime(slot.startsAt)
          const isSelected = slot.id === selectedSlotId
          return (
            <Button
              key={slot.id}
              variant={isSelected ? 'primary' : 'secondary'}
              shape="pill"
              aria-pressed={isSelected}
              aria-label={`${dayLabel(day)}, ${time}`}
              onClick={() => onSelect(slot)}
              className="min-h-11 px-0!"
            >
              {time}
            </Button>
          )
        })}
      </div>
    </section>
  )
}

export default TimeList
