import { CalendarX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Alert, Button, FormField, Input, Link } from '../../../components/ui'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../../lib/http'
import {
  clearSilentCheck,
  PhoneVerification,
  type ResumedSilentCheck,
  type VerifiedPhone,
} from '../../phone-verification'
import { bookVisit, getProperty, getSlots } from '../api'
import {
  addDays,
  BOOKING_WINDOW_DAYS,
  dayLabel,
  madridDay,
  madridTime,
  monthOf,
  monthsBetween,
} from '../calendar'
import { readSavedVisitForm, type SavedVisitForm } from '../savedVisitForm'
import type { BookedVisit, PropertySummary as Property, Slot } from '../types'
import MonthCalendar from './MonthCalendar'
import PropertySummary from './PropertySummary'
import TimeList from './TimeList'

type Props = {
  propertyId: number
  /** Called with the confirmed visit, so the page can open the confirmation screen (A6). */
  onBooked: (visit: BookedVisit) => void
  /** A silent check the visitor came back from, with the form saved before it. */
  resumedCheck?: ResumedSilentCheck
}

type Restored = { check: ResumedSilentCheck; form: SavedVisitForm }

type Load =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  // `today` is the Madrid day when the slots arrived, which is what they were computed for
  | { status: 'ready'; property: Property; slots: Slot[]; today: string }

type Step = 'calendar' | 'verify' | 'booking'

type Notice = { variant: 'warning' | 'error'; text: string }

const NAME_MAX_LENGTH = 100
const pageHeading = 'font-display text-3xl font-bold text-balance text-brand-dark'

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : SYSTEM_ERROR_MESSAGE
}

// Only a form saved for this same property is restored: anything else is an old entry
function restore(check: ResumedSilentCheck | undefined, propertyId: number): Restored | undefined {
  const form = check ? readSavedVisitForm(check.saved.form) : undefined
  return check && form?.propertyId === propertyId ? { check, form } : undefined
}

function slotLabel(slot: Slot): string {
  return `${dayLabel(madridDay(slot.startsAt))}, from ${madridTime(slot.startsAt)} to ${madridTime(slot.endsAt)}`
}

function VisitBooking({ propertyId, onBooked, resumedCheck }: Props) {
  const [restored] = useState(() => restore(resumedCheck, propertyId))
  // Handed to the verification screen once: after any step change it has been used
  const [pendingCheck, setPendingCheck] = useState(restored?.check)
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [step, setStep] = useState<Step>(restored ? 'verify' : 'calendar')
  const [stepChangedByVisitor, setStepChangedByVisitor] = useState(false)
  const [pickedDay, setPickedDay] = useState(() =>
    restored ? madridDay(restored.form.slot.startsAt) : undefined,
  )
  const [shownMonth, setShownMonth] = useState<string>()
  const [selectedSlotId, setSelectedSlotId] = useState(restored?.form.slot.id)
  const [name, setName] = useState(restored?.form.visitorName ?? '')
  // Kept after a 409, so the visitor books another time without a new SMS
  const [verification, setVerification] = useState<VerifiedPhone>()
  // A new key mounts a fresh verification screen after the server rejects the last one
  const [verificationAttempt, setVerificationAttempt] = useState(0)
  const [notice, setNotice] = useState<Notice>()
  const noticeRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // A saved form that does not belong here is never used, so it is deleted
  useEffect(() => {
    if (resumedCheck && !restored) {
      clearSilentCheck()
    }
  }, [resumedCheck, restored])

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getProperty(propertyId, controller.signal),
      getSlots(propertyId, controller.signal),
    ])
      .then(([property, slots]) =>
        setLoad({ status: 'ready', property, slots, today: madridDay(new Date()) }),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 404) {
          setLoad({ status: 'not-found' })
        } else {
          setLoad({ status: 'error', message: errorMessage(error) })
        }
      })
    return () => controller.abort()
  }, [propertyId, attempt])

  // Each step replaces the button that was pressed, so the focus moves to the new message or heading
  useEffect(() => {
    if (notice) {
      noticeRef.current?.focus()
    } else if (stepChangedByVisitor) {
      headingRef.current?.focus()
    }
  }, [notice, step, stepChangedByVisitor])

  function goTo(next: Step) {
    setPendingCheck(undefined)
    setStepChangedByVisitor(true)
    setStep(next)
  }

  if (load.status === 'loading') {
    return (
      <p role="status" className="font-body text-text-muted">
        Loading the free times…
      </p>
    )
  }

  if (load.status === 'not-found') {
    return (
      <section className="flex flex-col items-start gap-4">
        <h1 className={pageHeading}>This property is not available</h1>
        <p className="font-body text-text-default">
          It may have been rented or sold, or the link may be wrong.
        </p>
        <Link to="/">See other properties</Link>
      </section>
    )
  }

  if (load.status === 'error') {
    return (
      <section className="flex flex-col items-start gap-4">
        <h1 className={pageHeading}>We couldn't load the free times</h1>
        <Alert variant="error">{load.message}</Alert>
        <Button
          variant="secondary"
          onClick={() => {
            setLoad({ status: 'loading' })
            setAttempt((count) => count + 1)
          }}
        >
          Try again
        </Button>
      </section>
    )
  }

  const { property, slots, today } = load
  const summary = <PropertySummary property={property} />

  // From a restored silent check the verification finishes first, even if its time was taken
  if (slots.length === 0 && step === 'calendar') {
    return (
      <div className="flex flex-col gap-6">
        {summary}
        <section className="flex flex-col items-center gap-4 text-center">
          <span
            aria-hidden="true"
            className="flex size-18 items-center justify-center rounded-pill bg-surface-input text-brand-primary"
          >
            <CalendarX className="size-8" />
          </span>
          <h1 className={pageHeading}>No free times in the next 14 days</h1>
          <p className="font-body text-text-default">
            The agency hasn't opened more times for this property yet. Have a look at other
            properties, or come back in a few days.
          </p>
          <Link to="/">See other properties</Link>
        </section>
      </div>
    )
  }

  const months = monthsBetween(today, addDays(today, BOOKING_WINDOW_DAYS))
  const freeDays = new Set(slots.map((slot) => madridDay(slot.startsAt)))
  // Empty only while a restored silent check finishes, and then no calendar is shown
  const firstFreeDay = slots.length > 0 ? madridDay(slots[0].startsAt) : today
  // The first free day is chosen on arrival, so there are times to see straight away
  const day = pickedDay && freeDays.has(pickedDay) ? pickedDay : firstFreeDay
  const month = shownMonth ?? monthOf(day)
  const monthIndex = months.indexOf(month)
  const slotsOfDay = slots.filter((slot) => madridDay(slot.startsAt) === day)
  // A restored time may have been booked by someone else meanwhile: booking it then gets a 409
  const selectedSlot =
    slots.find((slot) => slot.id === selectedSlotId) ??
    (restored?.form.slot.id === selectedSlotId ? restored?.form.slot : undefined)
  const visitorName = name.trim()
  const rebooking = verification !== undefined

  async function book(slot: Slot, verifiedPhone: VerifiedPhone) {
    goTo('booking')
    setNotice(undefined)
    try {
      const visit = await bookVisit({
        slotId: slot.id,
        visitorName,
        phone: verifiedPhone.phone,
        phoneVerificationId: verifiedPhone.verificationId,
      })
      onBooked(visit)
    } catch (error) {
      const code = error instanceof ApiError ? error.code : undefined
      if (code === 'PHONE_VERIFICATION_INVALID') {
        setVerification(undefined)
        setVerificationAttempt((count) => count + 1)
        setNotice({ variant: 'error', text: errorMessage(error) })
        goTo('verify')
        return
      }
      setVerification(verifiedPhone)
      if (code === 'SLOT_UNAVAILABLE') {
        setLoad({
          status: 'ready',
          property,
          today,
          slots: slots.filter((free) => free.id !== slot.id),
        })
        setSelectedSlotId(undefined)
        setNotice({
          variant: 'warning',
          text: `Someone has just booked ${dayLabel(madridDay(slot.startsAt))} at ${madridTime(slot.startsAt)}. Your phone is still verified, so you can book another time straight away.`,
        })
      } else {
        setNotice({ variant: 'error', text: errorMessage(error) })
      }
      goTo('calendar')
    }
  }

  function handleContinue() {
    if (!selectedSlot || visitorName === '') return
    if (verification) {
      void book(selectedSlot, verification)
    } else {
      setNotice(undefined)
      goTo('verify')
    }
  }

  const noticeBox = notice ? (
    <div ref={noticeRef} tabIndex={-1}>
      <Alert variant={notice.variant}>{notice.text}</Alert>
    </div>
  ) : null

  if (step === 'booking') {
    return (
      <h1 ref={headingRef} tabIndex={-1} className={pageHeading}>
        Booking your visit…
      </h1>
    )
  }

  if (step === 'verify' && selectedSlot) {
    return (
      <div className="flex flex-col gap-6">
        <Button variant="link" className="self-start" onClick={() => goTo('calendar')}>
          Back to the calendar
        </Button>
        <div className="flex flex-col gap-2">
          <h1 ref={headingRef} tabIndex={-1} className={pageHeading}>
            Confirm your visit
          </h1>
          <p className="font-body text-text-default">
            {property.title}: {slotLabel(selectedSlot)}.
          </p>
        </div>
        {noticeBox}
        <PhoneVerification
          key={verificationAttempt}
          purpose="VISIT"
          formToKeep={{ propertyId, visitorName, slot: selectedSlot } satisfies SavedVisitForm}
          resumed={pendingCheck}
          onVerified={(verifiedPhone) => void book(selectedSlot, verifiedPhone)}
        />
      </div>
    )
  }

  const missing =
    !selectedSlot && visitorName === ''
      ? 'Choose a time and enter your name'
      : !selectedSlot
        ? 'Choose a time'
        : visitorName === ''
          ? 'Enter your name'
          : undefined

  return (
    <div className="flex flex-col gap-6">
      <Link to={`/properties/${property.id}`} className="self-start">
        Back to the property
      </Link>
      {summary}
      <div className="flex flex-col gap-2">
        <h1 ref={headingRef} tabIndex={-1} className={pageHeading}>
          {rebooking ? 'Choose another time' : 'Choose a time for your video visit'}
        </h1>
        <p className="font-body text-text-muted">
          The visit lasts 30 minutes. Times are in Madrid time.
        </p>
      </div>
      {noticeBox}
      <MonthCalendar
        month={month}
        previousMonth={monthIndex > 0 ? months[monthIndex - 1] : undefined}
        nextMonth={
          monthIndex >= 0 && monthIndex < months.length - 1 ? months[monthIndex + 1] : undefined
        }
        freeDays={freeDays}
        selectedDay={day}
        onSelectDay={(picked) => {
          setPickedDay(picked)
          setSelectedSlotId(undefined)
        }}
        onShowMonth={setShownMonth}
      />
      <TimeList
        day={day}
        slots={slotsOfDay}
        selectedSlotId={selectedSlotId}
        onSelect={(slot) => setSelectedSlotId(slot.id)}
      />
      <FormField id="visitor-name" label="Your name" hint="The agency sees it with your visit.">
        {(props) => (
          <Input
            {...props}
            autoComplete="name"
            maxLength={NAME_MAX_LENGTH}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
      </FormField>
      <div className="flex flex-col gap-2 text-center">
        <Button
          disabled={missing !== undefined}
          aria-describedby="booking-status"
          onClick={handleContinue}
          className="min-h-12"
        >
          {rebooking ? 'Book this time' : 'Continue'}
        </Button>
        <p id="booking-status" role="status" className="font-body text-sm text-text-default">
          {missing
            ? `${missing} to ${rebooking ? 'book your visit' : 'continue'}.`
            : selectedSlot
              ? `${slotLabel(selectedSlot)}.`
              : null}
        </p>
        {rebooking ? null : (
          <p className="font-body text-sm text-text-muted">
            Next, we'll text you a code to check your phone.
          </p>
        )}
      </div>
    </div>
  )
}

export default VisitBooking
