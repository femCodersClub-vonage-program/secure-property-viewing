import { useCallback, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Link } from '../components/ui'
import { RoomLinks, roomOpensAt } from '../features/video-visit'
import {
  ConfirmationUnavailable,
  madridTime,
  readConfirmationState,
  VisitConfirmation,
  type VisitConfirmationState,
} from '../features/visit-booking'

function VisitConfirmationPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { visit, roomLinksCreated } = readConfirmationState(location.state)
  // Read once: after this page creates the visitor link, the history says so for the next reload
  const [createdBefore] = useState(roomLinksCreated)

  const markRoomLinksCreated = useCallback(() => {
    if (!visit) return
    const state: VisitConfirmationState = { visit, roomLinksCreated: true }
    void navigate(location.pathname, { replace: true, state })
  }, [navigate, location.pathname, visit])

  if (!visit || String(visit.visitId) !== id) {
    return (
      <main className="mx-auto flex max-w-lg flex-col px-4 py-8">
        <title>Confirmation not available · Peephole</title>
        <ConfirmationUnavailable />
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-7 px-4 py-8">
      <title>Your visit is booked · Peephole</title>
      <VisitConfirmation visit={visit} />
      <RoomLinks
        visitId={visit.visitId}
        opensAt={madridTime(roomOpensAt(visit.startsAt))}
        createdBefore={createdBefore}
        onFirstVisitorLink={markRoomLinksCreated}
      />
      <Link to="/" className="self-start">
        See other properties
      </Link>
    </main>
  )
}

export default VisitConfirmationPage
