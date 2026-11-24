import { useCallback, useState } from 'react'
import { useParams } from 'react-router'
import { isSignedOut, SignInRedirect } from '../features/agency-dashboard'
import { getAgencyVideoToken, VideoRoom } from '../features/video-visit'
import NotFoundPage from './NotFoundPage'

function AgencyVideoRoomPage() {
  const { id } = useParams()
  const visitId = Number(id)
  const [signedOut, setSignedOut] = useState(false)
  // Hooks go before any return. It's only called with a valid id: otherwise, the page returns early
  const loadAccess = useCallback(async () => {
    try {
      return await getAgencyVideoToken(visitId)
    } catch (error) {
      // The session ended: she signs in again and comes back to this room
      if (isSignedOut(error)) setSignedOut(true)
      throw error
    }
  }, [visitId])

  // Only a positive whole number is a visit id: "abc" or "1.5" show "Page not found"
  if (!Number.isInteger(visitId) || visitId <= 0) {
    return <NotFoundPage />
  }

  if (signedOut) {
    return <SignInRedirect />
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col px-4 py-8">
      <title>Video visit · Peephole</title>
      <VideoRoom loadAccess={loadAccess} />
    </main>
  )
}

export default AgencyVideoRoomPage
