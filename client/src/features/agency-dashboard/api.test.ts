import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../lib/http'
import {
  errorMessage,
  getAgencySummary,
  getAgencyVisits,
  parseAgencySummary,
  parseAgencyVisits,
} from './api'

// specs/agency-dashboard.md, "API": response of GET /api/agency/summary, verbatim
const visitExample = {
  visitId: 31,
  startsAt: '2026-11-10T11:00:00+01:00',
  visitorName: '...',
  propertyTitle: 'Apartment in Gràcia',
}

// specs/post-visit-call.md, "API": an item of alerts, verbatim
const alertExample = {
  visitId: 31,
  visitorName: 'Laura Gómez',
  propertyTitle: 'Apartment in Gràcia',
  startsAt: '2026-11-10T11:00:00+01:00',
  reportedAt: '2026-11-10T11:47:12+01:00',
}

const summaryExample = {
  agentName: 'Marta',
  newRequests: 12,
  upcomingVisits: 8,
  activeProperties: 5,
  nextVisits: [visitExample],
  alerts: [alertExample],
}

// specs/agency-dashboard.md, "API": one item of GET /api/agency/visits, verbatim
const agencyVisitExample = {
  visitId: 31,
  startsAt: '2026-11-10T11:00:00+01:00',
  endsAt: '2026-11-10T11:30:00+01:00',
  visitorName: '...',
  propertyTitle: 'Apartment in Gràcia',
  status: 'CONFIRMED',
}

const answerWith = (body: unknown) =>
  vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  )

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parseAgencySummary', () => {
  it('reads the summary of the spec example', () => {
    expect(parseAgencySummary(summaryExample)).toEqual(summaryExample)
  })

  it('reads a summary from before the post-visit call, without alerts, as one with none', () => {
    const { alerts: _alerts, ...withoutAlerts } = summaryExample

    expect(parseAgencySummary(withoutAlerts)).toEqual({ ...summaryExample, alerts: [] })
  })

  it('reads a summary with no upcoming visits', () => {
    expect(parseAgencySummary({ ...summaryExample, nextVisits: [] })).toEqual({
      ...summaryExample,
      nextVisits: [],
    })
  })

  it.each([
    { name: 'a missing count', data: { ...summaryExample, newRequests: undefined } },
    { name: 'a count as text', data: { ...summaryExample, upcomingVisits: '8' } },
    { name: 'a negative count', data: { ...summaryExample, activeProperties: -1 } },
    { name: 'a count with decimals', data: { ...summaryExample, newRequests: 1.5 } },
    { name: 'no agent name', data: { ...summaryExample, agentName: null } },
    { name: 'nextVisits that is not a list', data: { ...summaryExample, nextVisits: null } },
    {
      name: 'a visit with an unreadable time',
      data: { ...summaryExample, nextVisits: [{ ...visitExample, startsAt: 'tomorrow' }] },
    },
    {
      name: 'a visit without an id',
      data: { ...summaryExample, nextVisits: [{ ...visitExample, visitId: undefined }] },
    },
    {
      name: 'a visit without a visitor name',
      data: { ...summaryExample, nextVisits: [{ ...visitExample, visitorName: undefined }] },
    },
    {
      name: 'a visit without a property title',
      data: { ...summaryExample, nextVisits: [{ ...visitExample, propertyTitle: undefined }] },
    },
    { name: 'alerts that is not a list', data: { ...summaryExample, alerts: null } },
    {
      name: 'an alert without a visitor name',
      data: { ...summaryExample, alerts: [{ ...alertExample, visitorName: undefined }] },
    },
    {
      name: 'an alert without a property title',
      data: { ...summaryExample, alerts: [{ ...alertExample, propertyTitle: undefined }] },
    },
    {
      name: 'an alert whose id is not a number',
      data: { ...summaryExample, alerts: [{ ...alertExample, visitId: '31' }] },
    },
    {
      name: 'an alert with an unreadable visit time',
      data: { ...summaryExample, alerts: [{ ...alertExample, startsAt: 'yesterday' }] },
    },
    {
      name: 'an alert with an unreadable report time',
      data: { ...summaryExample, alerts: [{ ...alertExample, reportedAt: undefined }] },
    },
    { name: 'no body', data: null },
  ])('refuses a summary with $name', ({ data }) => {
    expect(() => parseAgencySummary(data)).toThrow()
  })
})

describe('getAgencySummary', () => {
  it('asks for the summary with a relative path and the signal that can cancel it', async () => {
    const fetchMock = answerWith(summaryExample)
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await expect(getAgencySummary(controller.signal)).resolves.toEqual(summaryExample)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/agency/summary',
      expect.objectContaining({ signal: controller.signal }),
    )
  })

  it('turns an answer that breaks the contract into a system error', async () => {
    vi.stubGlobal('fetch', answerWith({ agentName: 'Marta' }))

    const error: unknown = await getAgencySummary().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'system', message: SYSTEM_ERROR_MESSAGE })
  })
})

describe('parseAgencyVisits', () => {
  it('reads the visits of the spec example', () => {
    expect(parseAgencyVisits([agencyVisitExample])).toEqual([agencyVisitExample])
  })

  it('reads a week with no visits', () => {
    expect(parseAgencyVisits([])).toEqual([])
  })

  it.each(['CANCELED', 'COMPLETED'])('reads a visit in %s', (status) => {
    expect(parseAgencyVisits([{ ...agencyVisitExample, status }])).toEqual([
      { ...agencyVisitExample, status },
    ])
  })

  it.each([
    { name: 'a body that is not a list', data: { visits: [agencyVisitExample] } },
    { name: 'no body', data: null },
    { name: 'a visit with an unknown status', data: [{ ...agencyVisitExample, status: 'MISSED' }] },
    {
      name: 'a visit with an unreadable start',
      data: [{ ...agencyVisitExample, startsAt: 'tomorrow' }],
    },
    { name: 'a visit without an end', data: [{ ...agencyVisitExample, endsAt: undefined }] },
    { name: 'a visit with its id as text', data: [{ ...agencyVisitExample, visitId: '31' }] },
    {
      name: 'a visit without a visitor name',
      data: [{ ...agencyVisitExample, visitorName: null }],
    },
    {
      name: 'a visit without a property title',
      data: [{ ...agencyVisitExample, propertyTitle: undefined }],
    },
  ])('refuses $name', ({ data }) => {
    expect(() => parseAgencyVisits(data)).toThrow()
  })
})

describe('getAgencyVisits', () => {
  it('asks for the days of the range with a relative path and the signal that can cancel it', async () => {
    const fetchMock = answerWith([agencyVisitExample])
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await expect(getAgencyVisits('2026-11-23', '2026-11-29', controller.signal)).resolves.toEqual([
      agencyVisitExample,
    ])
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/agency/visits?from=2026-11-23&to=2026-11-29',
      expect.objectContaining({ signal: controller.signal }),
    )
  })

  it('turns an answer that breaks the contract into a system error', async () => {
    vi.stubGlobal('fetch', answerWith([{ ...agencyVisitExample, status: 'MISSED' }]))

    const error: unknown = await getAgencyVisits('2026-11-23', '2026-11-29').catch(
      (caught: unknown) => caught,
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'system', message: SYSTEM_ERROR_MESSAGE })
  })
})

describe('errorMessage', () => {
  it('shows the message of a business error', () => {
    const error = new ApiError({
      kind: 'business',
      message: 'Sign in to continue.',
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
    })

    expect(errorMessage(error)).toBe('Sign in to continue.')
  })

  it('shows the general message for anything else', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toBe(SYSTEM_ERROR_MESSAGE)
  })
})
