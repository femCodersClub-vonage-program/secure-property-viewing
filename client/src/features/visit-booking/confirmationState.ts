import { readBookedVisit } from './api'
import type { BookedVisit } from './types'

/**
 * What the calendar leaves in the browser history for A6. It survives a reload, so the visit can
 * still be shown, but the room links never go in it: a link is only shown once.
 */
export type VisitConfirmationState = {
  visit: BookedVisit
  roomLinksCreated?: boolean
}

export function readConfirmationState(state: unknown): {
  visit: BookedVisit | undefined
  roomLinksCreated: boolean
} {
  if (typeof state !== 'object' || state === null || !('visit' in state)) {
    return { visit: undefined, roomLinksCreated: false }
  }
  return {
    visit: readBookedVisit(state.visit),
    roomLinksCreated: 'roomLinksCreated' in state && state.roomLinksCreated === true,
  }
}
