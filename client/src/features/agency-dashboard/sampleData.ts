import type { ListingRequestSummary } from './types'

// Shaped like the examples in specs/agency-dashboard.md, for the screens whose endpoint is not used yet.
// D1 and D4 read GET /api/agency/summary and GET /api/agency/visits, so they have no sample data any more
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
