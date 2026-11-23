import { request } from '../../lib/http'
import type { AgencySummary, UpcomingVisit, VisitAlert } from './types'

// Checks the server's answer before using it, as client/AGENTS.md asks.
// Contract: specs/agency-dashboard.md → "API" → GET /api/agency/summary

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
