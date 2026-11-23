import { ApiError, request } from '../../lib/http'
import type { AgencyRole, AgencySummary, AgencyUser, UpcomingVisit } from './types'

// Checks the server's answer before using it, as client/AGENTS.md asks.
// Contract: specs/agency-dashboard.md → "API" → GET /api/agency/summary

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// The server counts with a long, so a count is always a whole number and never negative
function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
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
