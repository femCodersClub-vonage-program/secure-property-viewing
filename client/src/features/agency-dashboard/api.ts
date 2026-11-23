import { request } from '../../lib/http'
import type { AgencySummary, AgencyVisit, UpcomingVisit, VisitStatus } from './types'

// Checks the server's answer before using it, as client/AGENTS.md asks.
// Contracts: specs/agency-dashboard.md → "API" → GET /api/agency/summary and GET /api/agency/visits

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// The server counts with a long, so a count is always a whole number and never negative
function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

// Rejects a date the screen could not show
function isInstant(value: unknown): value is string {
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

export function parseAgencyVisit(value: unknown): AgencyVisit {
  if (
    isObject(value) &&
    typeof value.visitId === 'number' &&
    Number.isInteger(value.visitId) &&
    isInstant(value.startsAt) &&
    isInstant(value.endsAt) &&
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
