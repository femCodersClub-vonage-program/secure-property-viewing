import { useCallback, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Card, Link } from '../components/ui'
import { RoomLinks, roomOpensAt } from '../features/video-visit'
import {
  ConfirmationUnavailable,
  madridTime,
  readConfirmationState,
  VisitBookedHeader,
  VisitConfirmation,
  type VisitConfirmationState,
} from '../features/visit-booking'

function VisitConfirmationPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { visit, photo, roomLinksCreated } = readConfirmationState(location.state)
  // Read once: after this page creates the visitor link, the history says so for the next reload
  const [createdBefore] = useState(roomLinksCreated)

  const markRoomLinksCreated = useCallback(() => {
    if (!visit) return
    const state: VisitConfirmationState = { visit, photo, roomLinksCreated: true }
    void navigate(location.pathname, { replace: true, state, preventScrollReset: true })
  }, [navigate, location.pathname, visit, photo])

  if (!visit || String(visit.visitId) !== id) {
    return (
      <main className="mx-auto flex max-w-lg flex-col px-4 py-8">
        <title>Confirmation not available · Peephole</title>
        <ConfirmationUnavailable />
      </main>
    )
  }

  return (
    <main>
      <title>Your visit is booked · Peephole</title>
      <VisitBookedHeader visitorName={visit.visitorName} />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <VisitConfirmation visit={visit} photo={photo} />
          <Card flush className="flex flex-col justify-between gap-6 p-4 sm:p-8">
            <RoomLinks
              visitId={visit.visitId}
              opensAt={madridTime(roomOpensAt(visit.startsAt))}
              createdBefore={createdBefore}
              onFirstVisitorLink={markRoomLinksCreated}
            />
          </Card>
        </div>
        <Link to="/" className="inline-block self-start py-2.5">
          See other properties
        </Link>
      </div>
    </main>
  )
}

export default VisitConfirmationPage
