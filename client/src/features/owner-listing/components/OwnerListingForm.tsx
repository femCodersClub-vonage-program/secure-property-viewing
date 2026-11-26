import { useState } from 'react'
import { Button } from '../../../components/ui'
import type { ListingStep } from '../types'
import StepIndicator from './StepIndicator'

const pageHeading = 'font-display text-3xl font-bold text-balance text-brand-dark'

// Holds the current step and, soon, the data of B2 to B4, so "Back" never loses what was entered
function OwnerListingForm() {
  const [step, setStep] = useState<ListingStep>('details')

  return (
    <div className="flex flex-col gap-6">
      <h1 className={pageHeading}>List my property</h1>
      <StepIndicator current={step} />

      {/* TEMPORARY: only to see the indicator change. Removed when B2 and B3 are built */}
      <div className="flex flex-wrap gap-4">
        <Button variant="secondary" onClick={() => setStep('details')}>
          Details
        </Button>
        <Button variant="secondary" onClick={() => setStep('property')}>
          Property
        </Button>
        <Button variant="secondary" onClick={() => setStep('verification')}>
          Verification
        </Button>
      </div>
    </div>
  )
}

export default OwnerListingForm