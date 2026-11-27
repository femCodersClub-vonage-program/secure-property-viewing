import type { LucideIcon } from 'lucide-react'
import { Button } from '../../../components/ui'

export type Choice<T extends string> = {
  value: T
  label: string
  icon: LucideIcon
}

type Props<T extends string> = {
  id: string
  label: string
  options: Choice<T>[]
  selected: T | ''
  error?: string
  onSelect: (value: T) => void
}

// One option out of a few, as buttons: the same pattern as the times of the visit calendar
function ChoiceGroup<T extends string>({
  id,
  label,
  options,
  selected,
  error,
  onSelect,
}: Props<T>) {
  const errorId = `${id}-error`

  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      aria-describedby={error ? errorId : undefined}
    >
      <p id={`${id}-label`} className="mb-2 font-body font-bold text-text-default">
        {label}
      </p>
      <div className="flex flex-wrap gap-3">
        {options.map(({ value, label: text, icon: Icon }) => (
          <Button
            key={value}
            type="button"
            shape="pill"
            variant={value === selected ? 'primary' : 'secondary'}
            aria-pressed={value === selected}
            onClick={() => onSelect(value)}
            className="min-h-11"
          >
            <Icon aria-hidden="true" className="size-4" />
            {text}
          </Button>
        ))}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1 font-body text-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default ChoiceGroup
