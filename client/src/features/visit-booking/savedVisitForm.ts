import { parseSlot } from './api'
import type { Slot } from './types'

/**
 * What the calendar saves before the silent check reloads the page, so the visitor finds their
 * time and name again. It never holds the SMS code.
 */
export type SavedVisitForm = {
  propertyId: number
  visitorName: string
  slot: Slot
}

/** The saved form, or undefined when it is missing, old or broken. */
export function readSavedVisitForm(data: unknown): SavedVisitForm | undefined {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('propertyId' in data) ||
    typeof data.propertyId !== 'number' ||
    !Number.isInteger(data.propertyId) ||
    data.propertyId <= 0 ||
    !('visitorName' in data) ||
    typeof data.visitorName !== 'string' ||
    data.visitorName.trim() === '' ||
    !('slot' in data)
  ) {
    return undefined
  }
  try {
    return {
      propertyId: data.propertyId,
      visitorName: data.visitorName,
      slot: parseSlot(data.slot),
    }
  } catch {
    return undefined
  }
}

export function visitBookingPath(propertyId: number): string {
  return `/properties/${propertyId}/visit`
}
