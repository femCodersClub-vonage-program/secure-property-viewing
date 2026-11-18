import { request } from '../../lib/http'
import { isVideoRole } from './roles'
import type { RoomLink, RoomLinkRole, VideoToken } from './types'

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

function isFilledString(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}

// Checks the server's answer before using it, as client/AGENTS.md asks
export function parseVideoToken(data: unknown): VideoToken {
  if (
    typeof data === 'object' &&
    data !== null &&
    'applicationId' in data &&
    isFilledString(data.applicationId) &&
    'sessionId' in data &&
    isFilledString(data.sessionId) &&
    'token' in data &&
    isFilledString(data.token) &&
    'role' in data &&
    isVideoRole(data.role) &&
    'closesAt' in data &&
    typeof data.closesAt === 'string' &&
    !Number.isNaN(Date.parse(data.closesAt)) // rejects a date that can't be read
  ) {
    return {
      applicationId: data.applicationId,
      sessionId: data.sessionId,
      token: data.token,
      role: data.role,
      closesAt: new Date(data.closesAt),
    }
  }
  throw new Error('Unexpected video-token response')
}

/** For the visitor and her guests: the room token from the link is the access, no session needed. */
export function getRoomVideoToken(roomToken: string): Promise<VideoToken> {
  return request('/api/room-links/video-token', parseVideoToken, {
    method: 'POST',
    body: JSON.stringify({ token: roomToken }),
  })
}

/** For a signed-in agent of the agency that owns the property. */
export function getAgencyVideoToken(visitId: number): Promise<VideoToken> {
  return request(`/api/agency/visits/${visitId}/video-token`, parseVideoToken, {
    method: 'POST',
  })
}
