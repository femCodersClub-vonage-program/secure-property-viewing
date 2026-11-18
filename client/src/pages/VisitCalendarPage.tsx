import { useNavigate, useParams } from 'react-router'
import { VisitBooking, type VisitConfirmationState } from '../features/visit-booking'
import NotFoundPage from './NotFoundPage'

function VisitCalendarPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const propertyId = Number(id)

  if (!Number.isInteger(propertyId) || propertyId <= 0) {
    return <NotFoundPage />
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-8">
      {/* The key starts the screen afresh, loading state included, when the property changes */}
      <VisitBooking
        key={propertyId}
        propertyId={propertyId}
        onBooked={(visit) => {
          const state: VisitConfirmationState = { visit }
          void navigate(`/visits/${visit.visitId}/confirmation`, { state })
        }}
      />
    </main>
  )
}

export default VisitCalendarPage
