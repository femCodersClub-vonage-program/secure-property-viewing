import type { Operation } from '../property-browsing'

export type ListingRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type VisitStatus = 'CONFIRMED' | 'CANCELED' | 'COMPLETED'

/** One item of GET /api/agency/visits */
export type AgencyVisit = {
  visitId: number
  startsAt: string
  endsAt: string
  visitorName: string
  propertyTitle: string
  status: VisitStatus
}

/** One item of GET /api/agency/listing-requests */
export type ListingRequestSummary = {
  id: number
  ownerName: string
  title: string
  operation: Operation
  priceEuros: number
  createdAt: string
  status: ListingRequestStatus
}
