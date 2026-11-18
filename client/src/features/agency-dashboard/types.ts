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
