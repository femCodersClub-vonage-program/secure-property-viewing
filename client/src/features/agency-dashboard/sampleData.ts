import type { AgencyVisit, ListingRequestSummary } from './types'

// Shaped like the examples in specs/agency-dashboard.md, until the agency endpoints are in dev
export const SAMPLE_VISITS: AgencyVisit[] = [
  {
    visitId: 31,
    startsAt: '2027-01-12T11:00:00+01:00',
    endsAt: '2027-01-12T11:30:00+01:00',
    visitorName: 'Laura Gómez',
    propertyTitle: 'Apartment in Gràcia',
    status: 'CONFIRMED',
  },
  {
    visitId: 32,
    startsAt: '2027-01-12T17:30:00+01:00',
    endsAt: '2027-01-12T18:00:00+01:00',
    visitorName: 'Joan Puig',
    propertyTitle: 'Studio in Poblenou',
    status: 'CONFIRMED',
  },
  {
    visitId: 33,
    startsAt: '2027-01-14T10:00:00+01:00',
    endsAt: '2027-01-14T10:30:00+01:00',
    visitorName: 'Amina Benali',
    propertyTitle: 'Flat in Sants',
    status: 'CANCELED',
  },
]

export const SAMPLE_LISTING_REQUESTS: ListingRequestSummary[] = [
  {
    id: 18,
    ownerName: 'Ana Torres',
    title: 'Apartment in Gràcia',
    operation: 'RENT',
    priceEuros: 1200,
    createdAt: '2027-01-08T11:00:00+01:00',
    status: 'PENDING',
  },
  {
    id: 19,
    ownerName: 'Marc Vidal',
    title: 'House in Sarrià',
    operation: 'SALE',
    priceEuros: 650000,
    createdAt: '2027-01-05T09:15:00+01:00',
    status: 'APPROVED',
  },
  {
    id: 20,
    ownerName: 'Lucía Romero',
    title: 'Studio in Raval',
    operation: 'RENT',
    priceEuros: 750,
    createdAt: '2027-01-04T16:40:00+01:00',
    status: 'REJECTED',
  },
]
