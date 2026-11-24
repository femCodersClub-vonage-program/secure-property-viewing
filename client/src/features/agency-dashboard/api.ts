import { ApiError, request } from '../../lib/http'
import type {
  AgencyRole,
  AgencySummary,
  AgencyUser,
  AgencyVisit,
  UpcomingVisit,
  VisitAlert,
  VisitStatus,
} from './types'

// Checks the server's answer before using it, as client/AGENTS.md asks.
// Contracts: specs/agency-dashboard.md → "API" → GET /api/agency/summary and GET /api/agency/visits

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
