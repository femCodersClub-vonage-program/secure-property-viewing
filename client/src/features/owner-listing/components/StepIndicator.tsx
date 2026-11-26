import type { Ref } from 'react'
import type { ListingStep } from '../types'

// The steps in order, and the name the owner sees for each
const STEP_ORDER: ListingStep[] = ['details', 'property', 'verification']
const STEP_LABELS: Record<ListingStep, string> = {
  details: 'Details',
  property: 'Property',
  verification: 'Verification',
}

type Props = {
  current: ListingStep
  ref?: Ref<HTMLParagraphElement>
}

function StepIndicator({ current, ref }: Props) {
  const currentNumber = STEP_ORDER.indexOf(current) + 1

  return (
    <div className="flex flex-col gap-2">
      <p
        ref={ref}
        tabIndex={-1}
        className="font-body text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        Step {currentNumber} of {STEP_ORDER.length}: {STEP_LABELS[current]}
      </p>
      <ol aria-label="Form progress" className="flex flex-wrap gap-4">
        {STEP_ORDER.map((step, index) => {
          const isCurrent = step === current
          return (
            <li
              key={step}
              aria-current={isCurrent ? 'step' : undefined}
              className="flex items-center gap-2 font-body"
            >
              <span
                aria-hidden="true"
                className={[
                  'flex size-8 items-center justify-center rounded-pill border',
                  isCurrent
                    ? 'border-brand-primary bg-brand-primary text-text-light'
                    : 'border-border-input text-text-muted',
                ].join(' ')}
              >
                {index + 1}
              </span>
              <span className={isCurrent ? 'font-bold text-text-default' : 'text-text-muted'}>
                {STEP_LABELS[step]}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default StepIndicator
