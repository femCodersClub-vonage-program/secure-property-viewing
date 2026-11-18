import { request } from '../../lib/http'
import type { RoomLink, RoomLinkRole } from './types'

export function parseRoomLink(data: unknown): RoomLink {
  if (
    typeof data === 'object' &&
    data !== null &&
    'role' in data &&
    (data.role === 'VISITOR' || data.role === 'GUEST') &&
    'token' in data &&
    typeof data.token === 'string' &&
    data.token !== ''
  ) {
    return { role: data.role, token: data.token }
  }
  throw new Error('Unexpected POST /api/visits/{id}/room-links response')
}

/** Only works from the browser that booked the visit, as the video visit spec decides. */
export function createRoomLink(visitId: number, role: RoomLinkRole): Promise<RoomLink> {
  return request(`/api/visits/${visitId}/room-links`, parseRoomLink, {
    method: 'POST',
    body: JSON.stringify({ role }),
  })
}
