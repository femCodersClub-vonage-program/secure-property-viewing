import type { FormEvent } from 'react'
import { BedSingle, Building2, Euro, FileText, House, KeyRound, MapPin, Tag } from 'lucide-react'
import { Button, Card, FormField, Input, Textarea } from '../../../components/ui'
import type { Operation, PropertyType } from '../../property-browsing'
import type { ListingFormData } from '../types'
import { MAX_LENGTH, type ListingFieldErrors } from '../validation'
import ChoiceGroup, { type Choice } from './ChoiceGroup'
import FormSection from './FormSection'

const OPERATIONS: Choice<Operation>[] = [
  { value: 'RENT', label: 'Rent', icon: KeyRound },
  { value: 'SALE', label: 'Sale', icon: Tag },
]

const PROPERTY_TYPES: Choice<PropertyType>[] = [
  { value: 'APARTMENT', label: 'Apartment', icon: Building2 },
  { value: 'HOUSE', label: 'House', icon: House },
  { value: 'STUDIO', label: 'Studio', icon: BedSingle },
]

// The spec: €/month for rent and € for sale
function priceText(operation: ListingFormData['operation']) {
  if (operation === 'RENT')
    return { label: 'Price (€/month)', hint: 'Monthly rent, in whole euros.' }
  if (operation === 'SALE') return { label: 'Price (€)', hint: 'Sale price, in whole euros.' }
  return { label: 'Price', hint: 'Choose rent or sale above, then the price in whole euros.' }
}

type Props = {
  data: ListingFormData
  errors: ListingFieldErrors
  onChange: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void
  onBack: () => void
  onContinue: () => void
}

// B3: only shows the property's fields; the parent keeps the data and decides what comes next
function PropertyDetailsStep({ data, errors, onChange, onBack, onContinue }: Props) {
  const price = priceText(data.operation)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onContinue()
  }

  return (
    <Card className="px-6 py-8 sm:px-10">
      <form
        noValidate
        aria-labelledby="property-details-title"
        onSubmit={handleSubmit}
        className="flex flex-col gap-6"
      >
        <div>
          <h2
            id="property-details-title"
            className="font-display text-2xl font-bold text-brand-secondary"
          >
            Property details
          </h2>
          <p className="mt-1 font-body text-text-muted">
            The agency reviews them before anything is published. All fields are required unless
            marked optional.
          </p>
        </div>

        <FormSection icon={Tag} title="What you are offering">
          <div className="grid items-start gap-5 md:grid-cols-2">
            <ChoiceGroup
              id="listing-operation"
              label="Operation"
              options={OPERATIONS}
              selected={data.operation}
              error={errors.operation}
              onSelect={(value) => onChange('operation', value)}
            />
            <ChoiceGroup
              id="listing-type"
              label="Property type"
              options={PROPERTY_TYPES}
              selected={data.propertyType}
              error={errors.propertyType}
              onSelect={(value) => onChange('propertyType', value)}
            />
          </div>
        </FormSection>

        <FormSection icon={FileText} title="About the property">
          <FormField
            id="listing-title"
            label="Title"
            hint='A short name people will see, such as "Apartment in Gràcia".'
            error={errors.title}
          >
            {(props) => (
              <Input
                {...props}
                required
                value={data.title}
                onChange={(event) => onChange('title', event.target.value)}
              />
            )}
          </FormField>
          <FormField
            id="listing-description"
            label="Description"
            hint="What makes it special: light, views, recent works."
            error={errors.description}
          >
            {(props) => (
              <>
                <Textarea
                  {...props}
                  // The counter is read too, after the hint and the error
                  aria-describedby={[props['aria-describedby'], 'listing-description-count']
                    .filter(Boolean)
                    .join(' ')}
                  required
                  rows={5}
                  value={data.description}
                  onChange={(event) => onChange('description', event.target.value)}
                />
                <p
                  id="listing-description-count"
                  className="mt-1 text-right font-body text-text-muted"
                >
                  {data.description.length.toLocaleString('en')} of{' '}
                  {MAX_LENGTH.description.toLocaleString('en')} characters
                </p>
              </>
            )}
          </FormField>
        </FormSection>

        <FormSection icon={MapPin} title="Location">
          <div className="grid items-start gap-5 md:grid-cols-2">
            <FormField
              id="listing-area"
              label="Neighborhood"
              hint="In Barcelona, such as Gràcia."
              error={errors.area}
            >
              {(props) => (
                <Input
                  {...props}
                  required
                  value={data.area}
                  onChange={(event) => onChange('area', event.target.value)}
                />
              )}
            </FormField>
            <FormField
              id="listing-address"
              label="Address"
              hint="Street and number."
              error={errors.address}
            >
              {(props) => (
                <Input
                  {...props}
                  required
                  autoComplete="street-address"
                  value={data.address}
                  onChange={(event) => onChange('address', event.target.value)}
                />
              )}
            </FormField>
          </div>
        </FormSection>

        <FormSection icon={Euro} title="Price and size">
          <div className="grid items-start gap-5 sm:grid-cols-2">
            <FormField
              id="listing-price"
              label={price.label}
              hint={price.hint}
              error={errors.priceEuros}
            >
              {(props) => (
                <Input
                  {...props}
                  required
                  inputMode="numeric"
                  value={data.priceEuros}
                  onChange={(event) => onChange('priceEuros', event.target.value)}
                />
              )}
            </FormField>
            <FormField
              id="listing-size"
              label="Size (m²)"
              hint="Usable area, in whole square meters."
              error={errors.sizeM2}
            >
              {(props) => (
                <Input
                  {...props}
                  required
                  inputMode="numeric"
                  value={data.sizeM2}
                  onChange={(event) => onChange('sizeM2', event.target.value)}
                />
              )}
            </FormField>
            <FormField
              id="listing-bedrooms"
              label="Bedrooms"
              hint="A studio has 0."
              error={errors.bedrooms}
            >
              {(props) => (
                <Input
                  {...props}
                  required
                  inputMode="numeric"
                  value={data.bedrooms}
                  onChange={(event) => onChange('bedrooms', event.target.value)}
                />
              )}
            </FormField>
            <FormField
              id="listing-floor"
              label="Floor (optional)"
              hint="0 is the ground floor, -1 a basement."
              error={errors.floor}
            >
              {(props) => (
                // No numeric keyboard here: on iPhone it has no minus key for -1
                <Input
                  {...props}
                  value={data.floor}
                  onChange={(event) => onChange('floor', event.target.value)}
                />
              )}
            </FormField>
          </div>
        </FormSection>

        <div className="flex flex-wrap justify-between gap-4 border-t border-border pt-6">
          <Button type="button" variant="secondary" onClick={onBack}>
            Back
          </Button>
          <Button type="submit">Continue</Button>
        </div>
      </form>
    </Card>
  )
}

export default PropertyDetailsStep
