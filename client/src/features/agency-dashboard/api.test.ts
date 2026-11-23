import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, SYSTEM_ERROR_MESSAGE } from '../../lib/http'
import { getAgencySummary, parseAgencySummary } from './api'

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

const answerWith = (body: unknown) =>
  vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  )

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
  afterEach(() => {
    vi.unstubAllGlobals()
  })

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
