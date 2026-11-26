import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { findSilentCheck } from '../features/phone-verification'
import { VisitBooking, type VisitConfirmationState } from '../features/visit-booking'
import NotFoundPage from './NotFoundPage'

function VisitCalendarPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const propertyId = Number(id)
  // Read on the first render only: the effect below removes the silent check's result from the URL
  const [resumedCheck] = useState(() => findSilentCheck('VISIT', location.hash))

  useEffect(() => {
    if (location.hash === '') {
      return
    }
    // `replace`, so neither "back" nor a reload sends the single-use code again
    void navigate(
      { pathname: location.pathname, search: location.search },
      { replace: true, preventScrollReset: true },
    )
  }, [location.hash, location.pathname, location.search, navigate])

  if (!Number.isInteger(propertyId) || propertyId <= 0) {
    return <NotFoundPage />
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-10">
      <title>Choose a time for your visit · Peephole</title>
      {/* The key starts the screen afresh, loading state included, when the property changes */}
      <VisitBooking
        key={propertyId}
        propertyId={propertyId}
        resumedCheck={resumedCheck}
        onBooked={(visit, photo) => {
          const state: VisitConfirmationState = { visit, photo }
          void navigate(`/visits/${visit.visitId}/confirmation`, { state })
        }}
      />
    </main>
  )
}

export default VisitCalendarPage
