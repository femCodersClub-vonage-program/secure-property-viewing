export type RoomLinkRole = 'VISITOR' | 'GUEST'

/** The answer of POST /api/visits/{id}/room-links. The token is the access to the room: never log it. */
export type RoomLink = {
  role: RoomLinkRole
  token: string
}

// Who is in the call. It travels in each connection's data, so every browser can label every video
export type VideoRole = 'VISITOR' | 'GUEST' | 'AGENCY'

/** The answer of both video-token endpoints. The token and sessionId give access to the call: never log them. */
export type VideoToken = {
  applicationId: string
  sessionId: string
  token: string
  role: VideoRole
  // Already a Date, so the room can compare it with the clock to leave the call
  closesAt: Date
}