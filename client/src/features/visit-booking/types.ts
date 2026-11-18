/** The fields of GET /api/properties/{id} that the calendar shows in its summary. */
export type PropertySummary = {
  id: number
  title: string
  operation: 'RENT' | 'SALE'
  priceEuros: number
  area: string
  bedrooms: number
  agency: { name: string; verified: boolean }
  images: { url: string; altText: string }[]
}

/** A free 30-minute slot from GET /api/properties/{id}/slots, with its Madrid offset. */
export type Slot = {
  id: number
  startsAt: string
  endsAt: string
}

/** The body of POST /api/visits. */
export type VisitRequest = {
  slotId: number
  visitorName: string
  phone: string
  phoneVerificationId: number
}

/** The answer of POST /api/visits: the visit is confirmed. */
export type BookedVisit = {
  visitId: number
  startsAt: string
  endsAt: string
  visitorName: string
  property: { title: string; area: string; address: string }
}
