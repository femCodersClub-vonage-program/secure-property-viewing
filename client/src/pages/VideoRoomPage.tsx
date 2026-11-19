import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  getRoomVideoToken,
  readRoomToken,
  VideoRoom,
  RoomLinkInvalid,
} from '../features/video-visit'

function VideoRoomPage() {
  const location = useLocation()
  const navigate = useNavigate()
  // Read on the first render only: the effect below removes the token from the address bar
  const [roomToken] = useState(() => readRoomToken(location.hash))

  useEffect(() => {
    if (location.hash === '') {
      return // already clean: nothing to do, and the effect doesn't loop
    }
    // Through the router, so its own copy of the URL loses the token too.
    // `replace` swaps the history entry, so "back" doesn't bring the token back
    void navigate({ pathname: location.pathname, search: location.search }, { replace: true })
  }, [location.hash, location.pathname, location.search, navigate])

  // Stable, so the call starts once. Only used with a token: without one, the page returns early
  const loadAccess = useCallback(() => getRoomVideoToken(roomToken ?? ''), [roomToken])

  if (roomToken === undefined) {
    return (
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-8">
        <title>Room link not valid · Peephole</title>
        <RoomLinkInvalid />
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col px-4 py-8">
      <title>Video visit · Peephole</title>
      <VideoRoom loadAccess={loadAccess} />
    </main>
  )
}

export default VideoRoomPage
