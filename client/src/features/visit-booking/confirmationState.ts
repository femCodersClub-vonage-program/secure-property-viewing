import { readBookedVisit } from './api'
import type { BookedVisit, PropertyPhoto } from './types'

/**
 * What the calendar leaves in the browser history for A6. It survives a reload, so the visit can
 * still be shown, but the room links never go in it: a link is only shown once.
 */
export type VisitConfirmationState = {
  visit: BookedVisit
  /** The cover photo, which the calendar already has and the booking answer doesn't bring. */
  photo?: PropertyPhoto
  roomLinksCreated?: boolean
}

function readPhoto(state: object): PropertyPhoto | undefined {
  if (!('photo' in state)) return undefined
  const { photo } = state
  if (
    typeof photo === 'object' &&
    photo !== null &&
    'url' in photo &&
    typeof photo.url === 'string' &&
    'altText' in photo &&
    typeof photo.altText === 'string'
  ) {
    return { url: photo.url, altText: photo.altText }
  }
  return undefined
}

export function readConfirmationState(state: unknown): {
  visit: BookedVisit | undefined
  photo: PropertyPhoto | undefined
  roomLinksCreated: boolean
} {
  if (typeof state !== 'object' || state === null || !('visit' in state)) {
    return { visit: undefined, photo: undefined, roomLinksCreated: false }
  }
  return {
    visit: readBookedVisit(state.visit),
    photo: readPhoto(state),
    roomLinksCreated: 'roomLinksCreated' in state && state.roomLinksCreated === true,
  }
}
