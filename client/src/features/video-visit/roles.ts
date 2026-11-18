import type { VideoRole } from './types'

const VIDEO_ROLES: readonly VideoRole[] = ['VISITOR', 'GUEST', 'AGENCY']

// Type guard: tells TypeScript the value is a VideoRole without using `as`
export function isVideoRole(value: unknown): value is VideoRole {
  return VIDEO_ROLES.some((role) => role === value)
}

// The label under each video, as the spec asks
export const ROLE_LABELS: Record<VideoRole, string> = {
  VISITOR: 'Visitor',
  GUEST: 'Guest',
  AGENCY: 'Agency',
}

/** Reads the role the server put in each connection's data, such as "role=VISITOR". */
export function roleFromConnectionData(data: string): VideoRole | undefined {
  // URLSearchParams already knows how to read "key=value", so we don't split by hand
  const role = new URLSearchParams(data).get('role')
  return isVideoRole(role) ? role : undefined
}