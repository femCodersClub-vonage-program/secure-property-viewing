import type { FormEvent } from 'react'
import { Button, Card, FormField, Input } from '../../../components/ui'
import type { ListingFormData } from '../types'
import type { ListingFieldErrors } from '../validation'

type Props = {
  data: ListingFormData
  errors: ListingFieldErrors
  onChange: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void
  onContinue: () => void
}

// B2: only shows the owner's fields; the parent keeps the data and decides what comes next
function OwnerDetailsStep({ data, errors, onChange, onContinue }: Props) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault() // without it, the browser would reload the page
    onContinue()
  }

  return (
    <Card className="px-6 py-8 sm:px-10">
      <form
        noValidate
        aria-labelledby="owner-details-title"
        onSubmit={handleSubmit}
        className="flex flex-col gap-6"
      >
        <div>
          <h2
            id="owner-details-title"
            className="font-display text-2xl font-bold text-brand-secondary"
          >
            Your details
          </h2>
          <p className="mt-1 font-body text-text-muted">
            The agency uses them to contact you about your property. All fields are required unless
            marked optional.
          </p>
        </div>

        <div className="grid items-start gap-5 sm:grid-cols-2">
          <FormField
            id="owner-name"
            label="Full name"
            hint="So the agency knows who to ask for."
            error={errors.ownerName}
          >
            {(props) => (
              <Input
                {...props}
                required
                autoComplete="name"
                value={data.ownerName}
                onChange={(event) => onChange('ownerName', event.target.value)}
              />
            )}
          </FormField>
          <FormField
            id="owner-phone"
            label="Phone number"
            hint="Spanish, or international starting with +."
            error={errors.ownerPhone}
          >
            {(props) => (
              <Input
                {...props}
                required
                type="tel"
                autoComplete="tel"
                value={data.ownerPhone}
                onChange={(event) => onChange('ownerPhone', event.target.value)}
              />
            )}
          </FormField>
        </div>

        <div className="flex justify-end border-t border-border pt-6">
          <Button type="submit">Continue</Button>
        </div>
      </form>
    </Card>
  )
}

export default OwnerDetailsStep
