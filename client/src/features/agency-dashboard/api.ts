import { ApiError, request, SYSTEM_ERROR_MESSAGE } from '../../lib/http'
import type { Operation, PropertyType } from '../property-browsing'
import type {
  AgencyRole,
  AgencySummary,
  AgencyUser,
  AgencyVisit,
  ApprovedListing,
  ListingRequestDetails,
  ListingRequestStatus,
  ListingRequestSummary,
  RejectedListing,
  UpcomingVisit,
  VisitAlert,
  VisitStatus,
} from './types'

// Checks the server's answer before using it, as client/AGENTS.md asks.
// Contracts: specs/agency-dashboard.md → "API" → the summary, the visits and the listing requests

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// The server counts with a long, so a count is always a whole number and never negative
function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

// Rejects a date the dashboard could not show
function isDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

const VISIT_STATUSES: readonly VisitStatus[] = ['CONFIRMED', 'CANCELED', 'COMPLETED']

// some() compares the unknown value with each status, so the type is narrowed without `as`
function isVisitStatus(value: unknown): value is VisitStatus {
  return VISIT_STATUSES.some((status) => status === value)
}

export function parseUpcomingVisit(value: unknown): UpcomingVisit {
  if (
    isObject(value) &&
    typeof value.visitId === 'number' &&
    Number.isInteger(value.visitId) &&
    typeof value.startsAt === 'string' &&
    !Number.isNaN(Date.parse(value.startsAt)) && // rejects a date the table could not show
    typeof value.visitorName === 'string' &&
    typeof value.propertyTitle === 'string'
  ) {
    return {
      visitId: value.visitId,
      startsAt: value.startsAt,
      visitorName: value.visitorName,
      propertyTitle: value.propertyTitle,
    }
  }
  throw new Error('Unexpected visit in nextVisits of GET /api/agency/summary')
}

// Contract: specs/post-visit-call.md → "API" → alerts
export function parseVisitAlert(value: unknown): VisitAlert {
  if (
    isObject(value) &&
    typeof value.visitId === 'number' &&
    Number.isInteger(value.visitId) &&
    typeof value.visitorName === 'string' &&
    typeof value.propertyTitle === 'string' &&
    isDateTime(value.startsAt) &&
    isDateTime(value.reportedAt)
  ) {
    return {
      visitId: value.visitId,
      visitorName: value.visitorName,
      propertyTitle: value.propertyTitle,
      startsAt: value.startsAt,
      reportedAt: value.reportedAt,
    }
  }
  throw new Error('Unexpected alert in alerts of GET /api/agency/summary')
}

// A server from before the post-visit call sends no alerts, which means there are none to show
function parseAlerts(value: unknown): VisitAlert[] {
  if (value === undefined) return []
  if (Array.isArray(value)) return value.map(parseVisitAlert)
  throw new Error('Unexpected alerts in GET /api/agency/summary')
}

export function parseAgencySummary(data: unknown): AgencySummary {
  if (
    isObject(data) &&
    typeof data.agentName === 'string' &&
    isCount(data.newRequests) &&
    isCount(data.upcomingVisits) &&
    isCount(data.activeProperties) &&
    Array.isArray(data.nextVisits)
  ) {
    return {
      agentName: data.agentName,
      newRequests: data.newRequests,
      upcomingVisits: data.upcomingVisits,
      activeProperties: data.activeProperties,
      // One broken visit breaks the whole answer: the contract says every visit has all four fields
      nextVisits: data.nextVisits.map(parseUpcomingVisit),
      alerts: parseAlerts(data.alerts),
    }
  }
  throw new Error('Unexpected GET /api/agency/summary response')
}

/** The D1 summary of the signed-in agent. Without a session the server answers 401 AUTHENTICATION_REQUIRED. */
export function getAgencySummary(signal?: AbortSignal): Promise<AgencySummary> {
  return request('/api/agency/summary', parseAgencySummary, { signal })
}

const AGENCY_ROLES = new Set(['ADMIN', 'AGENT'])

// Type guard: if it returns true, TypeScript knows value is an AgencyRole, so no `as` is needed
function isAgencyRole(value: unknown): value is AgencyRole {
  return typeof value === 'string' && AGENCY_ROLES.has(value)
}

// Checks the answer before using it, as parseAgencySummary does
export function parseAgencyUser(data: unknown): AgencyUser {
  if (isObject(data) && typeof data.name === 'string' && isAgencyRole(data.role)) {
    return { name: data.name, role: data.role }
  }
  throw new Error('Unexpected /api/agency/session response')
}

/** A wrong email or password answers 401 INVALID_CREDENTIALS, without saying which one. */
export function signIn(email: string, password: string): Promise<AgencyUser> {
  return request('/api/agency/session', parseAgencyUser, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

/** The signed-in agent. Without a session the server answers 401 AUTHENTICATION_REQUIRED. */
export function getSession(signal?: AbortSignal): Promise<AgencyUser> {
  return request('/api/agency/session', parseAgencyUser, { signal })
}

/**
 * The message a dashboard screen shows when a call fails: the server's message for a business error,
 * such as 401 AUTHENTICATION_REQUIRED, and the general one for anything else (docs/design-system.md → States).
 */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : SYSTEM_ERROR_MESSAGE
}

/** True when the server says there is no signed-in agent, from any agency call. */
export function isSignedOut(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'AUTHENTICATION_REQUIRED'
}

// 204 has no body, so there is nothing to check
export function signOut(): Promise<void> {
  return request('/api/agency/session', () => undefined, { method: 'DELETE' })
}

export function parseAgencyVisit(value: unknown): AgencyVisit {
  if (
    isObject(value) &&
    typeof value.visitId === 'number' &&
    Number.isInteger(value.visitId) &&
    isDateTime(value.startsAt) &&
    isDateTime(value.endsAt) &&
    typeof value.visitorName === 'string' &&
    typeof value.propertyTitle === 'string' &&
    isVisitStatus(value.status)
  ) {
    return {
      visitId: value.visitId,
      startsAt: value.startsAt,
      endsAt: value.endsAt,
      visitorName: value.visitorName,
      propertyTitle: value.propertyTitle,
      status: value.status,
    }
  }
  throw new Error('Unexpected visit in GET /api/agency/visits')
}

export function parseAgencyVisits(data: unknown): AgencyVisit[] {
  if (Array.isArray(data)) {
    // As in the summary, one broken visit breaks the whole answer
    return data.map(parseAgencyVisit)
  }
  throw new Error('Unexpected GET /api/agency/visits response')
}

/**
 * The agency's visits from `from` to `to`, both 'YYYY-MM-DD' days in Madrid and both included,
 * ordered by start time. The server answers 400 VALIDATION_FAILED for a range longer than 31 days.
 */
export function getAgencyVisits(
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<AgencyVisit[]> {
  const query = new URLSearchParams({ from, to })
  return request(`/api/agency/visits?${query.toString()}`, parseAgencyVisits, { signal })
}

const LISTING_REQUESTS_PATH = '/api/agency/listing-requests'

/** The longest rejection reason the server accepts, after trimming it */
export const REJECTION_REASON_MAX_LENGTH = 1000

const LISTING_REQUEST_STATUSES: readonly ListingRequestStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
]

/** Also checks a status read from the address, such as ?status=APPROVED in D2 */
export function isListingRequestStatus(value: unknown): value is ListingRequestStatus {
  return LISTING_REQUEST_STATUSES.some((status) => status === value)
}

const OPERATIONS: readonly Operation[] = ['RENT', 'SALE']

function isOperation(value: unknown): value is Operation {
  return OPERATIONS.some((operation) => operation === value)
}

const PROPERTY_TYPES: readonly PropertyType[] = ['APARTMENT', 'HOUSE', 'STUDIO']

function isPropertyType(value: unknown): value is PropertyType {
  return PROPERTY_TYPES.some((type) => type === value)
}

// The server sends ids as a long: always a whole number
function isId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

// A floor can be below the street, such as -1, so only whole numbers are checked
function isFloor(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isInteger(value))
}

// reviewedAt and rejectionReason are null, never missing, until the request is reviewed
function isNullableDateTime(value: unknown): value is string | null {
  return value === null || isDateTime(value)
}

function isNullableText(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

// Prices, bedrooms and sizes are whole numbers that are never negative, like the counts
export function parseListingRequestSummary(value: unknown): ListingRequestSummary {
  if (
    isObject(value) &&
    isId(value.id) &&
    typeof value.ownerName === 'string' &&
    typeof value.title === 'string' &&
    isOperation(value.operation) &&
    isCount(value.priceEuros) &&
    isDateTime(value.createdAt) &&
    isListingRequestStatus(value.status)
  ) {
    return {
      id: value.id,
      ownerName: value.ownerName,
      title: value.title,
      operation: value.operation,
      priceEuros: value.priceEuros,
      createdAt: value.createdAt,
      status: value.status,
    }
  }
  throw new Error('Unexpected listing request in GET /api/agency/listing-requests')
}

export function parseListingRequestSummaries(data: unknown): ListingRequestSummary[] {
  if (Array.isArray(data)) {
    // As with the visits, one broken request breaks the whole answer
    return data.map(parseListingRequestSummary)
  }
  throw new Error('Unexpected GET /api/agency/listing-requests response')
}

export function parseListingRequestDetails(data: unknown): ListingRequestDetails {
  if (
    isObject(data) &&
    isId(data.id) &&
    isListingRequestStatus(data.status) &&
    typeof data.ownerName === 'string' &&
    typeof data.ownerPhone === 'string' &&
    typeof data.title === 'string' &&
    typeof data.description === 'string' &&
    isPropertyType(data.propertyType) &&
    isOperation(data.operation) &&
    typeof data.area === 'string' &&
    typeof data.address === 'string' &&
    isCount(data.priceEuros) &&
    isCount(data.bedrooms) &&
    isCount(data.sizeM2) &&
    isFloor(data.floor) &&
    isDateTime(data.createdAt) &&
    isNullableDateTime(data.reviewedAt) &&
    isNullableText(data.rejectionReason)
  ) {
    return {
      id: data.id,
      status: data.status,
      ownerName: data.ownerName,
      ownerPhone: data.ownerPhone,
      title: data.title,
      description: data.description,
      propertyType: data.propertyType,
      operation: data.operation,
      area: data.area,
      address: data.address,
      priceEuros: data.priceEuros,
      bedrooms: data.bedrooms,
      sizeM2: data.sizeM2,
      floor: data.floor,
      createdAt: data.createdAt,
      reviewedAt: data.reviewedAt,
      rejectionReason: data.rejectionReason,
    }
  }
  throw new Error('Unexpected GET /api/agency/listing-requests/{id} response')
}

export function parseApprovedListing(data: unknown): ApprovedListing {
  if (isObject(data) && isId(data.propertyId)) {
    return { propertyId: data.propertyId }
  }
  throw new Error('Unexpected POST /api/agency/listing-requests/{id}/approve response')
}

export function parseRejectedListing(data: unknown): RejectedListing {
  if (isObject(data) && isId(data.id) && data.status === 'REJECTED') {
    return { id: data.id, status: 'REJECTED' }
  }
  throw new Error('Unexpected POST /api/agency/listing-requests/{id}/reject response')
}

/** D2: the requests with one status, the newest first. */
export function getListingRequests(
  status: ListingRequestStatus,
  signal?: AbortSignal,
): Promise<ListingRequestSummary[]> {
  const query = new URLSearchParams({ status })
  return request(`${LISTING_REQUESTS_PATH}?${query.toString()}`, parseListingRequestSummaries, {
    signal,
  })
}

/** D3: one request. An unknown id answers 404 NOT_FOUND. */
export function getListingRequest(
  id: number,
  signal?: AbortSignal,
): Promise<ListingRequestDetails> {
  return request(`${LISTING_REQUESTS_PATH}/${id}`, parseListingRequestDetails, { signal })
}

/** Publishes the request as an active property. 409 LISTING_REQUEST_ALREADY_REVIEWED if it is not pending. */
export function approveListingRequest(id: number): Promise<ApprovedListing> {
  return request(`${LISTING_REQUESTS_PATH}/${id}/approve`, parseApprovedListing, {
    method: 'POST',
  })
}

/**
 * Rejects the request with the agency's reason. The server trims it and answers 400 VALIDATION_FAILED,
 * with errors.reason, for a blank one or one longer than REJECTION_REASON_MAX_LENGTH.
 */
export function rejectListingRequest(id: number, reason: string): Promise<RejectedListing> {
  return request(`${LISTING_REQUESTS_PATH}/${id}/reject`, parseRejectedListing, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

/** True when the request was already approved or rejected, by another agent or an earlier click. */
export function isAlreadyReviewed(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'LISTING_REQUEST_ALREADY_REVIEWED'
}

/** True when the server says the request does not exist. */
export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'NOT_FOUND'
}

/** True when the server refused the rejection reason, so the form can point at its field. */
export function isInvalidReason(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.code === 'VALIDATION_FAILED' &&
    error.fieldErrors.reason !== undefined
  )
}
