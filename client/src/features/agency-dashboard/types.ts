import type { Operation, PropertyType } from '../property-browsing'

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

/** GET /api/agency/listing-requests/{id}. floor, reviewedAt and rejectionReason are null until they apply */
export type ListingRequestDetails = {
  id: number
  status: ListingRequestStatus
  ownerName: string
  ownerPhone: string
  title: string
  description: string
  propertyType: PropertyType
  operation: Operation
  area: string
  address: string
  priceEuros: number
  bedrooms: number
  sizeM2: number
  floor: number | null
  createdAt: string
  reviewedAt: string | null
  rejectionReason: string | null
}

/** POST /api/agency/listing-requests/{id}/approve: the property the request turned into */
export type ApprovedListing = {
  propertyId: number
}

/** POST /api/agency/listing-requests/{id}/reject */
export type RejectedListing = {
  id: number
  status: 'REJECTED'
}

/** One item of nextVisits in GET /api/agency/summary */
export type UpcomingVisit = {
  visitId: number
  startsAt: string
  visitorName: string
  propertyTitle: string
}

/** One item of alerts in GET /api/agency/summary: the visitor said someone asked for money before signing */
export type VisitAlert = {
  visitId: number
  visitorName: string
  propertyTitle: string
  startsAt: string
  reportedAt: string
}

/** GET /api/agency/summary */
export type AgencySummary = {
  agentName: string
  newRequests: number
  upcomingVisits: number
  activeProperties: number
  nextVisits: UpcomingVisit[]
  alerts: VisitAlert[]
}

export type AgencyRole = 'ADMIN' | 'AGENT'

/** POST and GET /api/agency/session */
export type AgencyUser = {
  name: string
  role: AgencyRole
}
