export type RoomLinkRole = 'VISITOR' | 'GUEST'

/** The answer of POST /api/visits/{id}/room-links. The token is the access to the room: never log it. */
export type RoomLink = {
  role: RoomLinkRole
  token: string
}
