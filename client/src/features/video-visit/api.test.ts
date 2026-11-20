import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getAgencyVideoToken,
  getRoomVideoToken,
  parseRoomLink,
  parseVideoToken,
  readOpensAt,
} from './api'
import { roomLinkUrl, roomOpensAt } from './room'

describe('video visit API', () => {
  it('reads the room link of the spec example', () => {
    // specs/video-visit.md, "API": response 201 of POST /api/visits/{id}/room-links
    expect(parseRoomLink({ role: 'GUEST', token: '<token>' })).toEqual({
      role: 'GUEST',
      token: '<token>',
    })
  })

  it('refuses an answer that breaks the contract', () => {
    expect(() => parseRoomLink({ role: 'AGENCY', token: 'abc' })).toThrow()
    expect(() => parseRoomLink({ role: 'VISITOR', token: '' })).toThrow()
    expect(() => parseRoomLink({ role: 'VISITOR' })).toThrow()
    expect(() => parseRoomLink(null)).toThrow()
  })
})

describe('room', () => {
  it('builds the link with the token after #, so it never reaches a server', () => {
    expect(roomLinkUrl('abc_-1', 'https://peephole.example')).toBe(
      'https://peephole.example/visits/room#abc_-1',
    )
  })

  it('opens 10 minutes before the visit starts', () => {
    expect(roomOpensAt('2026-11-23T11:00:00+01:00').toISOString()).toBe('2026-11-23T09:50:00.000Z')
  })
})

// specs/video-visit.md, "API": response 200 of both video-token endpoints, verbatim
const videoTokenExample = {
  applicationId: '…',
  sessionId: '…',
  token: '…',
  role: 'VISITOR',
  closesAt: '2026-11-23T11:45:00+01:00',
}

const answerWith = (body: unknown) =>
  vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  )

describe('video token', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the video token of the spec example', () => {
    expect(parseVideoToken(videoTokenExample)).toEqual({
      ...videoTokenExample,
      closesAt: new Date('2026-11-23T10:45:00Z'), // a Date, so the room can compare it with the clock
    })
  })

  it('refuses a video token that breaks the contract', () => {
    expect(() => parseVideoToken({ ...videoTokenExample, token: undefined })).toThrow()
    expect(() => parseVideoToken({ ...videoTokenExample, role: 'OWNER' })).toThrow()
    expect(() => parseVideoToken({ ...videoTokenExample, closesAt: 'tomorrow' })).toThrow()
    expect(() => parseVideoToken(null)).toThrow()
  })

  it('asks for the video token with the room token in the body, never in the URL', async () => {
    document.cookie = 'XSRF-TOKEN=test-token; path=/'
    const fetchMock = answerWith(videoTokenExample)
    vi.stubGlobal('fetch', fetchMock)

    await getRoomVideoToken('room-token-1')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/room-links/video-token',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ token: 'room-token-1' }) }),
    )
  })

  it('asks for the agency video token of the visit', async () => {
    document.cookie = 'XSRF-TOKEN=test-token; path=/'
    const fetchMock = answerWith({ ...videoTokenExample, role: 'AGENCY' })
    vi.stubGlobal('fetch', fetchMock)

    await getAgencyVideoToken(5)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/agency/visits/5/video-token',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

describe('readOpensAt', () => {
  it('reads when the room opens from a VIDEO_VISIT_NOT_OPEN error', () => {
    expect(readOpensAt({ opensAt: '2026-11-23T10:50:00+01:00' })).toEqual(
      new Date('2026-11-23T09:50:00Z'),
    )
  })

  it('returns undefined when the room has closed or the date is unreadable', () => {
    expect(readOpensAt({})).toBeUndefined() // closed: the server sends no opensAt
    expect(readOpensAt({ opensAt: 'soon' })).toBeUndefined()
    expect(readOpensAt(null)).toBeUndefined()
  })
})
