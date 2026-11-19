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

/**
 * Where the call is. One union, so the screen can never be in two states at once.
 * Only the states that carry data have extra fields.
 */
export type CallStatus =
  | { kind: 'connecting' }
  | { kind: 'waiting' } // in the call, but nobody else is yet
  | { kind: 'in-call' }
  | { kind: 'permissions-denied' }
  | { kind: 'media-failed' }
  | { kind: 'reconnecting' }
  | { kind: 'hung-up' }
  | { kind: 'time-over' }
  | { kind: 'not-open'; opensAt: Date }
  | { kind: 'error'; message: string }
