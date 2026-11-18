import { Check } from 'lucide-react'
import { Button } from '../../../components/ui'
import { dayLabel, isMorning, madridTime } from '../calendar'
import type { Slot } from '../types'

type Props = {
  day: string
  slots: Slot[]
  selectedSlotId: number | undefined
  onSelect: (slot: Slot) => void
}

function TimeGroup({ title, day, slots, selectedSlotId, onSelect }: Props & { title: string }) {
  if (slots.length === 0) {
    return null
  }
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-body text-sm font-bold tracking-wide text-text-muted uppercase">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => {
          const selected = slot.id === selectedSlotId
          const time = madridTime(slot.startsAt)
          return (
            <Button
              key={slot.id}
              variant={selected ? 'primary' : 'secondary'}
              shape="pill"
              aria-pressed={selected}
              aria-label={`${dayLabel(day)}, ${time}`}
              onClick={() => onSelect(slot)}
              className="min-h-11"
            >
              {selected ? <Check aria-hidden="true" className="size-4" /> : null}
              {time}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function TimeList({ day, slots, selectedSlotId, onSelect }: Props) {
  const morning = slots.filter((slot) => isMorning(slot.startsAt))
  const afternoon = slots.filter((slot) => !isMorning(slot.startsAt))

  return (
    <section aria-labelledby="free-times" className="flex flex-col gap-4">
      <h2 id="free-times" className="font-body text-lg font-bold text-brand-dark">
        Free times on {dayLabel(day)}
      </h2>
      <TimeGroup
        title="Morning"
        day={day}
        slots={morning}
        selectedSlotId={selectedSlotId}
        onSelect={onSelect}
      />
      <TimeGroup
        title="Afternoon"
        day={day}
        slots={afternoon}
        selectedSlotId={selectedSlotId}
        onSelect={onSelect}
      />
    </section>
  )
}

export default TimeList
